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
    FilterExpression=Attr('round_number').eq(round_number)
)
lineups = resp["Items"]
resp = users_table.scan()
users = resp["Items"]

for match in fixtures:
    print(f"Finalising {match['home']} v {match['away']}")
    for team in match:
        print(f"Finalising {team} lineup")
        lineup = [player for player in lineups if player['xrl_team'] == team]
        captain_count = len([player for player in lineup if player['captain']])
        powerplay = captain_count > 1
        print(f"Captain count is {captain_count}, powerplay is {powerplay}")
        starters = [player for player in lineup if not player['position_specific'].startswith('int')]
        print(f"Starters: {starters}")
        bench = [player for player in lineup if player['position_specific'].startswith('int')]
        print(f"Bench: {bench}")
        substitutions = 0
        vice_plays = False
        backup_kicks = False
        for player in starters:
            if not player['played_nrl']:
                if player['captain']:
                    vice_plays = True
                if player['kicker']:
                    backup_kicks = True
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
                        subs += 1
                        break
                if not valid_sub:
                    print(f"{player['player_name']} didn't play. No sub available in that position.")
            else:
                if player['backup_kicker'] and backup_kicks:
                    resp = stats_table.get_item(
                        Key={
                            'name+club': player['player_name'] + ';' + player['nrl_club'],
                            'round_number': round_number
                        }
                    )
                    kicking_stats = resp["Item"]["scoring_stats"]["kicker"]
                    kicking_score = kicking_stats["goals"] * 2 + kicking_stats["field_goals"]
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
                    lineups_table.update_item(
                        Key={
                            'name+nrl+xrl+round': player['name+nrl+xrl+round']
                        },
                        UpdateExpression="set score=score*2"                        
                    )

resp = lineups_table.scan(
    FilterExpression=Attr('round_number').eq(round_number)
)
lineups = resp["Items"]

for match in fixtures:
    home_user = [user for user in users if user['team_short'] == match[0]][0]
    home_lineup = [player for player in lineups if player['xrl_team'] == match['home']]
    home_score = sum([p['score'] for p in home_lineup if p['played_xrl']])
    away_user = [user for user in users if user['team_short'] == match[1]][0]
    away_lineup = [player for player in lineups if player['xrl_team'] == match['away']]
    away_score = sum([p['score'] for p in away_lineup if p['played_xrl']])

    home_user['stats']['for'] += home_score
    home_user['stats']['against'] += away_score
    away_user['stats']['for'] += away_score
    away_user['stats']['against'] += home_score
    if home_score > away_score: 
        home_user['stats']['points'] += 2
        home_user['stats']['wins'] = home_user['stats']['wins'] + 1
        away_user['stats']['losses'] = away_user['stats']['losses'] + 1
    elif home_score < away_score:
        away_user['stats']['points'] += 2
        home_user['stats']['losses'] = home_user['stats']['losses'] + 1
        away_user['stats']['wins'] = away_user['stats']['wins'] + 1
    else:
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
    
