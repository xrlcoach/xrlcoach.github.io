import boto3
from boto3.dynamodb.conditions import Key, Attr
import sys
from datetime import datetime

log = open('logs/start_round.log', 'a')
sys.stdout = log
print(f"Script executing at {datetime.now()}")

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
rounds_table = dynamodb.Table('rounds2020')
lineups_table = dynamodb.Table('lineups2020')
users_table = dynamodb.Table('users2020')

resp = rounds_table.scan(
    FilterExpression=Attr('in_progress').eq(False)
)
round_number = min([r['round_number'] for r in resp['Items']])
print(f"Active Round: {round_number}. Setting to 'in progress' and closing player scooping")

rounds_table.update_item(
    Key={
        'round_number': round_number
    },
    UpdateExpression="set in_progress=:t, scooping=:s",
    ExpressionAttributeValues={
        ':t': True,
        ':s': False
    }
)
print(f"Round {round_number} now in progress.")

print(f"Updating captaincy numbers...")
resp = users_table.scan()
users = resp["Items"]
resp = lineups_table.scan(
    FilterExpression=Attr('round_number').eq(str(round_number))
)
lineups = resp["Items"]

for user in users:
    lineup = [player for player in lineups if player['xrl_team'] == user['team_short']]
    captains = [player for player in lineup if player['captain'] or player['captain2']]
    powerplay = len(captains) > 1
    for captain in captains:
        print(f"{user['team_name']} captained {captain['player_name']}")
        if "captain_counts" not in user.keys():
            user['captain_counts'] = {}
        if captain['player_id'] not in user['captain_counts'].keys():
            user['captain_counts'][captain['player_id']] = 1
        else:
            if user['captain_counts'][captain['player_id']] == 6:
                print(f"ERROR - {user['team_name']} has already captained {captain['player_name']} six times. Removing as captain.")
                lineups_table.update_item(
                    Key={
                        'name+nrl+xrl+round': captain['name+nrl+xrl+round']
                    },
                        UpdateExpression="set captain=:c, captain2=:c2",
                        ExpressionAttributeValues={
                            ':c': False,
                            ':c2': False
                    }
                )
            else:
                user['captain_counts'][captain['player_id']] += 1
    vice = [player for player in lineup if player['vice']]
    if len(vice) > 0:
        vice = vice[0]
        if vice['player_id'] in user['captain_counts'].keys() and user['captain_counts'][vice['player_id']] == 6:
            print(f"ERROR - {user['team_name']} has already captained {vice['player_name']} six times. Removing as vice-captain.")
            lineups_table.update_item(
                Key={
                    'name+nrl+xrl+round': vice['name+nrl+xrl+round']
                },
                    UpdateExpression="set vice=:v",
                    ExpressionAttributeValues={
                        ':v': False
                }
            )
    if powerplay:
        print(f"{user['team_name']} used a powerplay. Updating database")
        users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set captain_counts=:cc, powerplays = powerplays - :v",
                ExpressionAttributeValues={
                    ':cc': user['captain_counts'],
                    ':v': 1
                }
            )
    else:
        users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set captain_counts=:cc",
                ExpressionAttributeValues={
                    ':cc': user['captain_counts']
                }
            )

print("Calculating new waiver order")
waiver_order = sorted(users, key=lambda u: u['waiver_rank'])
new_waiver_order = sorted(waiver_order, key=lambda u: u['players_picked'])
print("New order: ")
for rank, user in enumerate(new_waiver_order, 1):
    print(f"{rank}: {user['username']}")
    users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set waiver_rank=:wr, players_picked=:pp",
                ExpressionAttributeValues={
                    ':wr': rank,
                    ':pp': 0
                }
            )
print("Process complete")
    
