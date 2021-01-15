import boto3
import sqlite3

with sqlite3.connect('../data/xrl.db') as conn:
    conn.row_factory = sqlite3.Row
    db = conn.cursor()
    db.execute('SELECT player_name, nrl_team, position, position2 FROM squads2')
    players = db.fetchall()
    
dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')


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

table = dynamodb.Table('players2020')
player_id = 100000
with table.batch_writer() as batch:
    for player in players:
        player_id += 1
        try:
            batch.put_item(
                Item={
                    'player_id': str(player_id),
                    'player_name': player['player_name'],
                    'search_name': player['player_name'].lower(),
                    'nrl_club': player['nrl_team'],
                    'xrl_team': 'None',
                    'position': player['position'],
                    'position2': player['position2'],
                    'scoring_stats': {},
                    'stats': {},
                    'new_position_appearances': {}
                }
            )
        except Exception:
            print(f"Error uploading {player['player_name']}")
            continue

print('Players uploaded successfully')