import boto3

positions_general = {
    'Fullback': 'Back',
    'Winger': 'Back',
    'Centre': 'Back',
    'Five-Eighth': 'Playmaker', 
    'Halfback': 'Playmaker',
    'Hooker': 'Playmaker',
    'Prop': 'Forward',
    '2nd Row': 'Forward',
    'Lock': 'Forward',
    'None': ''
}

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
squads_table = dynamodb.Table('players2020')

players = squads_table.scan()['Items']

for player in players:
    if 'position2' not in player.keys() or not player['position2'] or player['position2'] not in positions_general.values():
        squads_table.update_item(
            Key={
                'player_id': player['player_id']
            },
            UpdateExpression="set position2=:v",
            ExpressionAttributeValues={
                ':v': ''
            }
        )
