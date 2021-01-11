import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')

players_table = dynamodb.Table('players2020')
players = players_table.scan(
    FilterExpression=Attr('new_position_appearances').exists()
)['Items']
for player in players:
    print(player['player_name'])