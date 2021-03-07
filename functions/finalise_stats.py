from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr
import sys
import math

log = open('logs/finalise_stats.log', 'a')
sys.stdout = log
print(f"Script executing at {datetime.now()}")

# dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
# stats_table = dynamodbResource.Table('stats2020')
# squads_table = dynamodbResource.Table('players2020')
# users_table = dynamodbResource.Table('users2020')
# lineups_table = dynamodbResource.Table('lineups2020')
# rounds_table = dynamodbResource.Table('rounds2020')
table = dynamodbResource.Table('XRL2021')


current_round = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('STATUS') & Key('data').eq('ACTIVE#true'),
    FilterExpression=Attr('in_progress').eq(True) & Attr('completed').eq(False)
)['Items'][0]
round_number = current_round['round_number']
print(f"Finalising Round {round_number}")
fixtures = table.query(
    KeyConditionExpression=Key('pk').eq('ROUND#' + str(round_number)) & Key('sk').begins_with('FIXTURE')
)['Items']

lineups = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('LINEUP#' + str(round_number)) & Key('data').begins_with('TEAM#')
)['Items']
#print(str(lineups[0]))
users = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('DETAILS') & Key('data').begins_with('NAME#')
)['Items']
#print(str(users[0]))

print("Finalising lineup substitutions and scores...")
for match in fixtures:
    print(f"Finalising {match['home']} v {match['away']}")
    for team in ['home', 'away']:
        print(f"Finalising {match[team]} lineup")
        user = [u for u in users if u['team_short'] == match[team]][0]
        lineup = [player for player in lineups if player['xrl_team'] == match[team]]
        # captain_count = len([player for player in lineup if player['captain'] or player['captain2']])
        # powerplay = captain_count > 1
        # user = [u for u in users if u['team_short'] == match[team]][0]
        # if powerplay:
        #     print(f"Captain count is {captain_count}, powerplay is {powerplay}. {match[team]} now have {user['powerplays'] - 1} powerplays left.")
        #     users_table.update_item(
        #         Key={
        #             'username': user['username']
        #         },
        #         UpdateExpression="set powerplays = powerplays - :v",
        #         ExpressionAttributeValues={
        #             ':v': 1
        #         }
        #     )
        starters = [player for player in lineup if player['position_number'] < 14]
        #print(f"Starters: {starters}")
        bench = [player for player in lineup if player['position_number'] >= 14]
        #print(f"Bench: {bench}")
        substitutions = 0
        vice_plays = False
        backup_kicks = False
        print("Checking if captain(s) and kicker played")
        for player in starters:
            if not player['played_nrl']:
                if player['captain'] or player['captain2']:
                    print(f"Captain {player['player_name']} did not play.")
                    table.update_item(
                        Key={
                            'pk': 'PLAYER#' + player['player_id'],
                            'sk': 'PROFILE'
                        },
                        UpdateExpression="set times_as_captain = times_as_captain - :i",
                        ExpressionAttributeValues={
                            ':i': 1
                        }
                    )
                    vice_plays = True
                if player['kicker']:
                    print(f"Kicker {player['player_name']} did not play.")
                    backup_kicks = True
        for player in starters:
            if player['played_nrl']:          
                if player['backup_kicker'] and backup_kicks:
                    print(f"{player['player_name']} takes over kicking duties. Adjusting score.")
                    resp = table.get_item(
                        Key={
                            'pk': 'PLAYER#' + player['player_id'],
                            'sk': 'STATS#' + str(round_number)
                        }
                    )
                    kicking_stats = resp["Item"]["scoring_stats"]["kicker"]
                    kicking_score = kicking_stats["goals"] * 2 + kicking_stats["field_goals"]
                    if player['captain'] or player['captain2']:
                        kicking_score *= 2
                    table.update_item(
                        Key={
                            'pk': player['pk'],
                            'sk': player['sk']
                        },
                        UpdateExpression="set score=score+:s",
                        ExpressionAttributeValues={
                            ':s': kicking_score
                        }
                    )
                if player['vice'] and vice_plays:
                    print(f"{player['player_name']} takes over captaincy duties. Adjusting lineup score and user's captain counts.")
                    resp = table.get_item(
                        Key={
                            'pk': player['pk'],
                            'sk': player['sk']
                        }
                    )
                    current_score = resp['Item']['score']
                    table.update_item(
                        Key={
                            'pk': player['pk'],
                            'sk': player['sk']
                        },
                        UpdateExpression="set score=:v",
                        ExpressionAttributeValues={
                            ':v': current_score * 2
                        }                        
                    )
                    # vice_entry = table.get_item(
                    #     Key={
                    #         'pk': player['pk'],
                    #         'sk': 'PROFILE'
                    #     }
                    # )['Item']
                    # if 'times_as_captain' not in vice_entry.keys():
                    #     tac = 1
                    # else:
                    #     tac = vice_entry['times_as_captain'] + 1
                    table.update_item(
                        Key={
                            'pk': player['pk'],
                            'sk': 'PROFILE'
                        },
                        UpdateExpression="set times_as_captain = times_as_captain + :i",
                        ExpressionAttributeValues={
                            ':i': 1
                        }
                    )
        freeSpots = {
            'Back': len([p for p in starters if p['position_general'] == 'Back' and not p['played_nrl']]),
            'Playmaker': len([p for p in starters if p['position_general'] == 'Playmaker' and not p['played_nrl']]),
            'Forward': len([p for p in starters if p['position_general'] == 'Forward' and not p['played_nrl']])
        }
        for sub in sorted(bench, key=lambda p: p['position_number']):
            subbed_in = False
            if freeSpots[sub['position_general']] > 0:
                if sub['played_nrl']:
                    print(f"Subbing in {sub['player_name']} as a {sub['position_general']}")
                    freeSpots[sub['position_general']] -= 1
                    subbed_in = True
                    table.update_item(
                        Key={
                            'pk': sub['pk'],
                            'sk': sub['sk']
                        },
                        UpdateExpression="set played_xrl=:p",
                        ExpressionAttributeValues={
                            ':p': True
                        }
                    )
            # if not subbed_in and sub['second_position'] != '':
            #     if freeSpots[sub['second_position']] > 0:
            #         print(f"Subbing in {sub['player_name']} as a {sub['second_position']}")
            #         freeSpots[sub['second_position']] -= 1
            #         subbed_in = True
            #         lineups_table.update_item(
            #                     Key={
            #                         'name+nrl+xrl+round': sub['name+nrl+xrl+round']
            #                     },
            #                     UpdateExpression="set played_xrl=:p",
            #                     ExpressionAttributeValues={
            #                         ':p': True
            #                     }
            #                 )
                

            #     valid_sub = False
            #     if substitutions == len(bench):
            #         print(f"{player['player_name']} didn't play. No more subs available.")
            #         continue
            #     for i in range(substitutions, len(bench)):
            #         substitute = [player for player in bench if player['position_specific'] == 'int' + str(i + 1)][0]
            #         if substitute['position_general'] == player['position_general'] and substitute['played_nrl']:
            #             print(f"{player['player_name']} didn't play. Subbing in {substitute['player_name']}")
            #             lineups_table.update_item(
            #                 Key={
            #                     'name+nrl+xrl+round': substitute['name+nrl+xrl+round']
            #                 },
            #                 UpdateExpression="set played_xrl=:p",
            #                 ExpressionAttributeValues={
            #                     ':p': True
            #                 }
            #             )
            #             valid_sub = True
            #             substitutions += 1
            #             break
            #     if not valid_sub:
            #         for i in range(substitutions, len(bench)):
            #             substitute = [player for player in bench if player['position_specific'] == 'int' + str(i + 1)][0]
            #             if substitute['second_position'] == player['position_general'] and substitute['played_nrl']:
            #                 print(f"{player['player_name']} didn't play. Subbing in {substitute['player_name']}")
            #                 lineups_table.update_item(
            #                     Key={
            #                         'name+nrl+xrl+round': substitute['name+nrl+xrl+round']
            #                     },
            #                     UpdateExpression="set played_xrl=:p",
            #                     ExpressionAttributeValues={
            #                         ':p': True
            #                     }
            #                 )
            #                 valid_sub = True
            #                 substitutions += 1
            #                 break
            #     if not valid_sub:
            #         print(f"{player['player_name']} didn't play. No sub available in that position.")
            # else:
print("Substitutions complete. Finalising match results...")
lineups = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('LINEUP#' + str(round_number)) & Key('data').begins_with('TEAM#')
)['Items']

for match in fixtures:
    home_user = [user for user in users if user['team_short'] == match['home']][0]
    home_lineup = [player for player in lineups if player['xrl_team'] == match['home']]
    home_score = sum([p['score'] for p in home_lineup if p['played_xrl']])
    match['home_score'] = home_score
    away_user = [user for user in users if user['team_short'] == match['away']][0]
    away_lineup = [player for player in lineups if player['xrl_team'] == match['away']]
    away_score = sum([p['score'] for p in away_lineup if p['played_xrl']])
    match['away_score'] = away_score

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
        home_user['stats']['draws'] = home_user['stats']['draws'] + 1
        away_user['stats']['draws'] = away_user['stats']['draws'] + 1
    table.update_item(
        Key={
            'pk': 'USER#' + home_user['username'],
            'sk': 'DETAILS'
        },
        UpdateExpression="set stats=:s",
        ExpressionAttributeValues={
            ':s': home_user['stats']
        }
    )
    table.update_item(
        Key={
            'pk': 'USER#' + away_user['username'],
            'sk': 'DETAILS'
        },
        UpdateExpression="set stats=:s",
        ExpressionAttributeValues={
            ':s': away_user['stats']
        }
    )
    table.update_item(
        Key={
            'pk': match['pk'],
            'sk': match['sk']
        },
        UpdateExpression='set home_score=:hs, away_score=:as, #D=:d',
        ExpressionAttributeNames={
            '#D': 'data'
        },
        ExpressionAttributeValues={
            ':hs': match['home_score'],
            ':as': match['away_score'],
            ':d': 'COMPLETED#true'
        }
    )

print("Results finalised, marking round as completed...")
table.update_item(
    Key={
        'pk': 'ROUND#' + str(round_number),
        'sk': 'STATUS'
    },
    UpdateExpression="set completed=:c",
    ExpressionAttributeValues={
        ':c': True
    }
)
print("Round finalised. Checking to see if player positions need updating")

# all_stats = stats_table.scan()['Items']
squads = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').begins_with('TEAM')
)['Items']
positions_general = {
    'Fullback': 'Back',
    'Winger': 'Back',
    'Centre': 'Back',
    'Five-Eighth': 'Playmaker', 
    'Halfback': 'Playmaker',
    'Hooker': 'Playmaker',
    'Prop': 'Forward',
    '2nd': 'Forward',
    '2nd Row': 'Forward',
    'Lock': 'Forward'
}
all_stats = []
for i in range(1, int(round_number)):
    all_stats += table.query(
        IndexName='sk-data-index',
        KeyConditionExpression=Key('sk').eq('STATS#' + str(i)) & Key('data').begins_with('CLUB#')
    )['Items']
appearances = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('STATS#' + str(round_number)) & Key('data').begins_with('CLUB#')
)['Items']
all_stats += appearances
for player in appearances:
    if player['stats']['Position'] == 'Interchange':
        continue
    player_info = [p for p in squads if p['player_id'] == player['player_id']][0]
    played_position = positions_general[player['stats']['Position']]
    if played_position not in [player_info['position'], player_info['position2']]:
        print(f"{player['player_name']} played as a {played_position} but is not recognised as such. Making a note on his player record.")
        if 'new_position_appearances' not in player_info.keys():
            player_info['new_position_appearances'] = {}
        if played_position not in player_info['new_position_appearances'].keys():
            player_info['new_position_appearances'][played_position] = 1
        else:
            player_info['new_position_appearances'][played_position] += 1
        table.update_item(
            Key={
                'pk': player_info['pk'],
                'sk': 'PROFILE'
            },
            UpdateExpression="set new_position_appearances=:npa",
            ExpressionAttributeValues={
                ':npa': player_info['new_position_appearances']
            }
        )
        if player_info['new_position_appearances'][played_position] == 3:
            print(f"{player['player_name']} has played as a {played_position} three times. Adding {played_position} to his positions.")
            if player_info['position2'] == '':
                table.update_item(
                    Key={
                        'pk': player_info['pk'],
                        'sk': 'PROFILE'
                    },
                    UpdateExpression="set position2=:v",
                    ExpressionAttributeValues={
                        ':v': played_position
                    }
                )
            else:
                print(f"{player['player_name']} can now play in all 3 positions!")
                table.update_item(
                    Key={
                        'pk': player_info['pk'],
                        'sk': 'PROFILE'
                    },
                    UpdateExpression="set position3=:v",
                    ExpressionAttributeValues={
                        ':v': played_position
                    }
                )
print('Positional updates complete. Updating player total stats')
for player in squads:
    player_stats = {}
    player_appearances = [stat for stat in all_stats if stat['player_id'] == player['player_id']]
    if len(player_appearances) == 0:
        continue
    player_stats['stats'] = {}
    player_stats['stats']['appearances'] = len(player_appearances)
    player_stats['scoring_stats'] = {}
    for app in player_appearances:
        for stat in app['stats'].keys():
            if type(app['stats'][stat]) is str or type(app['stats'][stat]) is dict:
                continue 
            if app['stats'][stat] % 1 != 0:
                continue
            if stat not in player_stats['stats']:
                player_stats['stats'][stat] = 0
            player_stats['stats'][stat] += app['stats'][stat]
        for position in app['scoring_stats'].keys():
            if position not in player_stats['scoring_stats']:
                player_stats['scoring_stats'][position] = {}
            for stat in app['scoring_stats'][position].keys():
                if stat not in player_stats['scoring_stats'][position]:
                    player_stats['scoring_stats'][position][stat] = 0
                if stat == 'send_offs':
                    if 'send_off_deduction' not in player_stats['scoring_stats'][position]:
                        player_stats['scoring_stats'][position]['send_off_deduction'] = 0
                    if app['scoring_stats'][position][stat] != 0:
                        player_stats['scoring_stats'][position][stat] += 1
                        minutes = 80 - int(app['scoring_stats'][position][stat])
                        deduction = math.floor(minutes / 10) + 4
                        player_stats['scoring_stats'][position]['send_off_deduction'] += deduction
                else:
                    player_stats['scoring_stats'][position][stat] += app['scoring_stats'][position][stat]
    for position in player_stats['scoring_stats'].keys():
        if position == 'kicker':
            player_stats['scoring_stats'][position]['points'] = player_stats['scoring_stats'][position]['goals'] * 2 + player_stats['scoring_stats'][position]['field_goals']
        else:
            player_stats['scoring_stats'][position]['points'] = player_stats['scoring_stats'][position]['tries'] * 4
            player_stats['scoring_stats'][position]['points'] += player_stats['scoring_stats'][position]['involvement_try'] * 4
            player_stats['scoring_stats'][position]['points'] += player_stats['scoring_stats'][position]['positional_try'] * 4
            player_stats['scoring_stats'][position]['points'] -= player_stats['scoring_stats'][position]['mia'] * 4
            player_stats['scoring_stats'][position]['points'] -= player_stats['scoring_stats'][position]['concede'] * 4
            player_stats['scoring_stats'][position]['points'] -= player_stats['scoring_stats'][position]['sin_bins'] * 2
            player_stats['scoring_stats'][position]['points'] -= player_stats['scoring_stats'][position]['send_off_deduction']
    #print('Updating ' + player['player_name'])
    table.update_item(
        Key={
            'pk': player['pk'],
            'sk': 'PROFILE'
        },
        UpdateExpression="set stats=:stats, scoring_stats=:scoring_stats",
        ExpressionAttributeValues={
            ':stats': player_stats['stats'],
            ':scoring_stats': player_stats['scoring_stats']
        }
    )


print("Script completed")