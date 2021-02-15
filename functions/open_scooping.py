import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime
import sys

log = open('logs/open_scooping.log', 'a')
sys.stdout = log
print(f"Script executing at {datetime.now()}")

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
rounds_table = dynamodb.Table('rounds2020')
players_table = dynamodb.Table('players2020')

print("Changing 'On Waivers' players to free agents")
#Find all players who are labelled as 'On Waivers'
on_waivers = players_table.scan(
    FilterExpression=Attr('xrl_team').eq('On Waivers')
)['Items']
#Update each of those players to have XRL team of 'None'
for player in on_waivers:
    players_table.update_item(
        Key={ 'player_id': player['player_id'] },
        UpdateExpression="set xrl_team=:n",
        ExpressionAttributeValues={ ':n': 'None' }
    )

print("Changing 'Pre-Waivers' players to 'On Waivers'")
#Find all players who are labelled as 'Pre-Waivers'
pre_waivers = players_table.scan(
    FilterExpression=Attr('xrl_team').eq('Pre-Waivers')
)['Items']
#Update those players to be 'On Waivers'
for player in pre_waivers:
    players_table.update_item(
        Key={ 'player_id': player['player_id'] },
        UpdateExpression="set xrl_team=:ow",
        ExpressionAttributeValues={ ':ow': 'On Waivers' }
    )

#Find all active rounds
resp = rounds_table.scan(
    FilterExpression=Attr('active').eq(True)
)
#Find the current active round
round_number = max([r['round_number'] for r in resp['Items']])

print(f"Current round: {round_number}. Setting 'scooping' to true")
#Update round to open scooping
rounds_table.update_item(
    Key={
        'round_number': round_number
    },
    UpdateExpression="set scooping=:t",
    ExpressionAttributeValues={
        ':t': True
    }
)
print(f"Player scooping is now open.")