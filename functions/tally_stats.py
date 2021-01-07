import boto3
from boto3.dynamodb.conditions import Key, Attr
import math

dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
stats_table = dynamodbResource.Table('stats2020')
squads_table = dynamodbResource.Table('players2020')

all_stats = stats_table.scan()['Items']
squads = squads_table.scan()['Items']
count = 0
players_without_stats = []
for player in squads:
    count += 1
    player_stats = {}
    player_appearances = [stat for stat in all_stats if stat['player_id'] == player['player_id']]
    if len(player_appearances) == 0:
        players_without_stats.append(player)
        continue
    player_stats['stats'] = {}
    player_stats['stats']['appearances'] = len(player_appearances)
    player_stats['scoring_stats'] = {}
    for app in player_appearances:
        for stat in app['stats'].keys():
            if type(app['stats'][stat]) is str:
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
                player_stats['scoring_stats'][position][stat] += app['scoring_stats'][position][stat]
                if stat == 'send_offs':
                    if 'send_off_deduction' not in player_stats['scoring_stats'][position]:
                        player_stats['scoring_stats'][position]['send_off_deduction'] = 0
                    if app['scoring_stats'][position][stat] != 0:
                        minutes = 80 - app['scoring_stats'][position][stat]
                        deduction = math.floor(minutes / 10) + 4
                        player_stats['scoring_stats'][position]['send_off_deduction'] += deduction
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
    print('Updating ' + player['player_name'])
    squads_table.update_item(
        Key={
            'player_id': player['player_id']
        },
        UpdateExpression="set stats=:stats, scoring_stats=:scoring_stats",
        ExpressionAttributeValues={
            ':stats': player_stats['stats'],
            ':scoring_stats': player_stats['scoring_stats']
        }
    )
# for player in players_without_stats:
#     count += 1
#     player_stats = {}
#     player_appearances = [all_stats[0]]
#     player_stats['stats'] = {}
#     player_stats['scoring_stats'] = {}
#     for app in player_appearances:
#         for stat in app['stats'].keys():
#             if type(app['stats'][stat]) is str:
#                 continue 
#             if app['stats'][stat] % 1 != 0:
#                 continue
#             if stat not in player_stats['stats']:
#                 player_stats['stats'][stat] = 0
#         for position in app['scoring_stats'].keys():
#             if position == 'kicker':
#                 player_stats['scoring_stats'][position] = {}
#                 for stat in app['scoring_stats'][position].keys():
#                     if stat not in player_stats['scoring_stats'][position]:
#                         player_stats['scoring_stats'][position][stat] = 0
#             else:
#                 player_stats['scoring_stats'][player['position']] = {}
#                 for stat in app['scoring_stats'][position].keys():
#                     if stat not in player_stats['scoring_stats'][player['position']]:
#                         player_stats['scoring_stats'][player['position']][stat] = 0
#                     if stat == 'send_offs':
#                         if 'send_off_deduction' not in player_stats['scoring_stats'][player['position']]:
#                             player_stats['scoring_stats'][player['position']]['send_off_deduction'] = 0
                    
#     for position in player_stats['scoring_stats'].keys():
#         if position == 'kicker':
#             player_stats['scoring_stats'][position]['points'] = 0
#         else:
#             player_stats['scoring_stats'][position]['points'] = 0
#     print('Giving ' + player['player_name'] + ' a blank stats entry')
#     squads_table.update_item(
#         Key={
#             'player_id': player['player_id']
#         },
#         UpdateExpression="set stats=:stats, scoring_stats=:scoring_stats",
#         ExpressionAttributeValues={
#             ':stats': player_stats['stats'],
#             ':scoring_stats': player_stats['scoring_stats']
#         }
#     )