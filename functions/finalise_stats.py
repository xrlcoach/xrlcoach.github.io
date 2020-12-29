from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
stats_table = dynamodbResource.Table('stats2020')
squads_table = dynamodbResource.Table('players2020')
users_table = dynamodbResource.Table('users2020')
lineups_table = dynamodbResource.Table('lineups2020')
rounds_table = dynamodbResource.Table('rounds2020')

print(f"Script executing at {datetime.now()}")

resp = rounds_table.scan(
    FilterExpression=Attr('completed').eq(False) & Attr('in_progress').eq(True)
)
current_round = resp['Items'][0]
round_number = current_round['round_number']
print(f"Finalising Round {round_number}")
fixtures = current_round['fixtures']

resp = lineups_table.scan(
    FilterExpression=Attr('round_number').eq(str(round_number))
)
lineups = resp["Items"]
#print(str(lineups[0]))
resp = users_table.scan()
users = resp["Items"]
#print(str(users[0]))

print("Finalising lineup substitutions and scores...")
for match in fixtures:
    print(f"Finalising {match['home']} v {match['away']}")
    for team in match:
        print(f"Finalising {match[team]} lineup")
        lineup = [player for player in lineups if player['xrl_team'] == match[team]]
        captain_count = len([player for player in lineup if player['captain'] or player['captain2']])
        powerplay = captain_count > 1
        user = [u for u in users if u['team_short'] == match[team]][0]
        if powerplay:
            print(f"Captain count is {captain_count}, powerplay is {powerplay}. {match[team]} now have {user['powerplays'] - 1} powerplays left.")
            users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set powerplays = powerplays - :v",
                ExpressionAttributeValues={
                    ':v': 1
                }
            )
        starters = [player for player in lineup if not player['position_specific'].startswith('int')]
        #print(f"Starters: {starters}")
        bench = [player for player in lineup if player['position_specific'].startswith('int')]
        #print(f"Bench: {bench}")
        substitutions = 0
        vice_plays = False
        backup_kicks = False
        print("Checking if captain(s) and kicker played")
        for player in starters:
            if not player['played_nrl']:
                if player['captain'] or player['captain2']:
                    print(f"Captain {player['player_name']} did not play.")
                    vice_plays = True
                if player['kicker']:
                    print(f"Kicker {player['player_name']} did not play.")
                    backup_kicks = True
        for player in starters:
            if not player['played_nrl']:            
                valid_sub = False
                if substitutions == len(bench):
                    print(f"{player['player_name']} didn't play. No more subs available.")
                    continue
                for i in range(substitutions, len(bench)):
                    substitute = [player for player in bench if player['position_specific'] == 'int' + str(i + 1)][0]
                    if substitute['position_general'] == player['position_general'] and substitute['played_nrl']:
                        print(f"{player['player_name']} didn't play. Subbing in {substitute['player_name']}")
                        lineups_table.update_item(
                            Key={
                                'name+nrl+xrl+round': substitute['name+nrl+xrl+round']
                            },
                            UpdateExpression="set played_xrl=:p",
                            ExpressionAttributeValues={
                                ':p': True
                            }
                        )
                        valid_sub = True
                        substitutions += 1
                        break
                if not valid_sub:
                    print(f"{player['player_name']} didn't play. No sub available in that position.")
            else:
                if player['backup_kicker'] and backup_kicks:
                    print(f"{player['player_name']} takes over kicking duties. Adjusting score.")
                    resp = stats_table.get_item(
                        Key={
                            'player_id': player['player_id'],
                            'round_number': str(round_number)
                        }
                    )
                    kicking_stats = resp["Item"]["scoring_stats"]["kicker"]
                    kicking_score = kicking_stats["goals"] * 2 + kicking_stats["field_goals"]
                    if player['captain'] or player['captain2']:
                        kicking_score *= 2
                    lineups_table.update_item(
                        Key={
                            'name+nrl+xrl+round': player['name+nrl+xrl+round']
                        },
                        UpdateExpression="set score=score+:s",
                        ExpressionAttributeValues={
                            ':s': kicking_score
                        }
                    )
                if player['vice'] and vice_plays:
                    print(f"{player['player_name']} takes over captaincy duties. Adjusting score.")
                    resp = lineups_table.get_item(
                        Key={
                            'name+nrl+xrl+round': player['name+nrl+xrl+round']
                        }
                    )
                    current_score = resp['Item']['score']
                    lineups_table.update_item(
                        Key={
                            'name+nrl+xrl+round': player['name+nrl+xrl+round']
                        },
                        UpdateExpression="set score=:v",
                        ExpressionAttributeValues={
                            ':v': current_score * 2
                        }                        
                    )

print("Substitutions complete. Finalising match results...")
resp = lineups_table.scan(
    FilterExpression=Attr('round_number').eq(str(round_number))
)
lineups = resp["Items"]

for match in fixtures:
    home_user = [user for user in users if user['team_short'] == match['home']][0]
    home_lineup = [player for player in lineups if player['xrl_team'] == match['home']]
    home_score = sum([p['score'] for p in home_lineup if p['played_xrl']])
    away_user = [user for user in users if user['team_short'] == match['away']][0]
    away_lineup = [player for player in lineups if player['xrl_team'] == match['away']]
    away_score = sum([p['score'] for p in away_lineup if p['played_xrl']])

    home_user['stats']['for'] += home_score
    home_user['stats']['against'] += away_score
    away_user['stats']['for'] += away_score
    away_user['stats']['against'] += home_score
    if home_score > away_score:
        print(f"{home_user['team_name']} {home_score} DEF. {away_score} {away_user['team_name']}") 
        home_user['stats']['points'] += 2
        home_user['stats']['wins'] = home_user['stats']['wins'] + 1
        away_user['stats']['losses'] = away_user['stats']['losses'] + 1
    elif home_score < away_score:
        print(f"{away_score} {away_user['team_name']} DEF. {home_user['team_name']} {home_score}") 
        away_user['stats']['points'] += 2
        home_user['stats']['losses'] = home_user['stats']['losses'] + 1
        away_user['stats']['wins'] = away_user['stats']['wins'] + 1
    else:
        print(f"{home_user['team_name']} {home_score} DRAW {away_score} {away_user['team_name']}")
        home_user['stats']['points'] += 1
        away_user['stats']['points'] += 1
        home_user['stats']['draws'] = home_user['stats']['losses'] + 1
        away_user['stats']['draws'] = away_user['stats']['wins'] + 1
    users_table.update_item(
        Key={
            'username': home_user['username']
        },
        UpdateExpression="set stats=:s",
        ExpressionAttributeValues={
            ':s': home_user['stats']
        }
    )
    users_table.update_item(
        Key={
            'username': away_user['username']
        },
        UpdateExpression="set stats=:s",
        ExpressionAttributeValues={
            ':s': away_user['stats']
        }
    )

print("Results finalised, marking round as completed...")
rounds_table.update_item(
    Key={
        'round_number': round_number
    },
    UpdateExpression="set completed=:c",
    ExpressionAttributeValues={
        ':c': True
    }
)
print("Round finalised.")
