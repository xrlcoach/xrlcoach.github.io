import boto3

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
table = dynamodb.Table('players2020')

resp = table.scan()
players = resp['Items']

for player in players:
    table.update_item(
        Key={
            'player_id': player['player_id']
        },
        UpdateExpression="set search_name=:d",
        ExpressionAttributeValues={
            ':d': player['player_name'].lower()
        }
    )