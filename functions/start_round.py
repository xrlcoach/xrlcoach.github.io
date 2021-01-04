import boto3
from boto3.dynamodb.conditions import Key, Attr
import sys
from datetime import datetime

log = open('start_round.log', 'a')
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
print(f"Active Round: {round_number}. Setting to 'in progress'")

rounds_table.update_item(
    Key={
        'round_number': round_number
    },
    UpdateExpression="set in_progress=:t",
    ExpressionAttributeValues={
        ':t': True
    }
)
print(f"Round {round_number} now in progress.")

print(f"Updating captaincy numbers...")
resp = users_table.scan()
users = resp["Items"]
resp = lineups_table.scan(
    FilterExpression=Attr('round_number').eq(round_number)
)
lineups = resp["Items"]

for user in users:
    lineup = [player for player in lineup if player['xrl_team'] == user['team_short']]
    captains = [player for player in lineup if player['captain'] or player['captain2']]
    powerplay = len(captains) > 1
    if powerplay:
        print(f"{user['team_name']} used a powerplay. Updating database")
        users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set powerplays = powerplays - :v",
                ExpressionAttributeValues={
                    ':v': 1
                }
            )
    for captain in captains:
        print(f"{user['team_name']} captained {captain['player_name']}")
        if "captain_counts" not in user.keys():
            user['captain_counts'] = {}
        if captain['player_id'] not in user['captain_counts'].keys():
            user['captain_counts'][captain['player_id']] = 1
        else:
            user['captain_counts'][captain['player_id']] += 1
