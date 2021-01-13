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

on_waivers = players_table.scan(
    FilterExpression=Attr('xrl_team').eq('On Waivers')
)['Items']
for player in on_waivers:
    players_table.update_item(
        Key={ 'player_id': player['player_id'] },
        UpdateExpression="set xrl_team=:n",
        ExpressionAttributeValues={ ':n': 'None' }
    )

pre_waivers = players_table.scan(
    FilterExpression=Attr('xrl_team').eq('Pre-Waivers')
)['Items']
for player in pre_waivers:
    players_table.update_item(
        Key={ 'player_id': player['player_id'] },
        UpdateExpression="set xrl_team=:ow",
        ExpressionAttributeValues={ ':ow': 'On Waivers' }
    )

resp = rounds_table.scan(
    FilterExpression=Attr('active').eq(True)
)
round_number = max([r['round_number'] for r in resp['Items']])
print(f"Current round: {round_number}. Setting 'scooping' to true")

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