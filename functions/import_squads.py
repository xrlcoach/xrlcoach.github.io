import boto3
from boto3.dynamodb.conditions import Key, Attr
import csv

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
old_table = dynamodb.Table('XRL2020')
new_table = dynamodb.Table('XRL2021')

clean_player_stats = {'Conversion Attempts': 0, 'Hit Ups': 0, 'Handling Errors': 0, 'Passes To Run Ratio': '', 'Post Contact Metres': 0,
'Passes': 0, 'Mins Played': 0, 'Goal Conversion Rate': 0, 'Penalties': 0, 'Stint Two': 0, 'Field Goals': 0, 'Line Breaks': 0, 'Kicks': 0,
'Ineffective Tackles': 0, 'All Runs': 0, 'Dummy Half Run Metres': 0, 'All Run Metres': 0, 'Tries': 0, 'Play The Ball': 0, 'Kicked Dead': 0,
'Grubbers': 0, 'Errors': 0, 'Offloads': 0, 'Conversions': 0, 'Penalty Goals': 0, '20/40': 0, 'Stint One': 0, 'Total Points': 0, '40/20': 0,
'Cross Field Kicks': 0, 'On Report': 0, 'One on One Steal': 0, 'Points': 0, 'Forced Drop Outs': 0, 'Dummy Passes': 0, 'Kicks Defused': 0, 'Sin Bins': 0,
'Kick Return Metres': 0, 'Opponent': 'Cowboys', 'Round': 0, 'Team': 'Broncos', 'Kicking Metres': 0, 'Ruck Infringements': 0, 'Tackles Made': 0,
'Line Break Assists': 0, 'Tackle Efficiency': '', 'Bomb Kicks': 0, 'Tackle Breaks': 0, 'Missed Tackles': 0, 'Try Assists': 0, 'Intercepts': 0,
 'Line Engaged Runs': 0, 'One on One Lost': 0, 'Receipts': 0, 'Send Offs': 0, 'Average Play The Ball Speed': '', 'Dummy Half Runs': 0}

print("Reading new player list")
with open('../data/squads2021.csv') as csv_file:
    reader = csv.DictReader(csv_file)
    new_player_list = list(reader)

print("Fetching existing player list")
old_player_list = old_table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').begins_with('TEAM#')
)['Items']
highest_id = max([int(p['player_id']) for p in old_player_list])

print("Iterating through new player list...")
for player in new_player_list:
    if player['NRL Team'] == 'Wests Tigers':
        player['NRL Team'] = player['NRL Team']
    elif player['NRL Team'] == 'Manly Sea Eagles':
        player['NRL Team'] = 'Sea Eagles'
    else:
        player['NRL Team'] = player['NRL Team'].split()[-1]
    existing_entry = [p for p in old_player_list if p['search_name'] == player['Player'].lower() and p['nrl_club'] == player['NRL Team']]
    if len(existing_entry) == 0:
        print(f"Couldn't find {player['Player']} at the {player['NRL Team']}. Searching just for name")
        existing_entry = [p for p in old_player_list if p['search_name'] == player['Player'].lower()]
        if len(existing_entry) == 0:
            print(f"Couldn't find {player['Player']} anywhere. Adding new player record.")
            player_id = str(highest_id + 1)
            highest_id += 1            
        elif len(existing_entry) > 1:
            print(f"Found more than one {player['Player']}. Fix manually")
            continue
        else:
            existing_entry = existing_entry[0]
            print(f"Found {player['Player']} at the {existing_entry['nrl_club']}.")
            player_id = existing_entry['player_id']
    elif len(existing_entry) > 1:
            print(f"Found more than one {player['Player']}. Fix manually")
            continue
    else:
        existing_entry = existing_entry[0]
        player_id = existing_entry['player_id']
    new_table.put_item(
        Item={
            'pk': 'PLAYER#' + player_id,
            'sk': 'PROFILE',
            'data': 'TEAM#None',
            'player_id': player_id,
            'player_name': player['Player'],
            'nrl_club': player['NRL Team'],
            'xrl_team': 'None',
            'search_name': player['Player'].lower(),
            'position': player['Position 1'],
            'position2': None,
            'stats': clean_player_stats,
            'scoring_stats': {
                player['Position 1']: {'sin_bins': 0, 'positional_try': 0, 'tries': 0,
                'involvement_try': 0, 'mia': 0, 'concede': 0, 'send_offs': 0, 'points': 0},
                'kicker': {'goals': 0, 'field_goals': 0, 'points': 0}
            },
            'new_position_appearances': {},
            'times_as_captain': 0
        }   
    )

# table = dynamodb.create_table(
#         TableName='players2020',
#         KeySchema=[
#             {
#                 'AttributeName': 'player_name',
#                 'KeyType': 'HASH'  # Partition key
#             },
#             {
#                 'AttributeName': 'nrl_club',
#                 'KeyType': 'RANGE'  # Sort key
#             }
#         ],
#         AttributeDefinitions=[
#             {
#                 'AttributeName': 'player_name',
#                 'AttributeType': 'S'
#             },
#             {
#                 'AttributeName': 'nrl_club',
#                 'AttributeType': 'S'
#             }            
#         ],
#         ProvisionedThroughput={
#             'ReadCapacityUnits': 5,
#             'WriteCapacityUnits': 5
#         }
#     )

