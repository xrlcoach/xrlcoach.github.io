import boto3

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
lineups_table = dynamodb.Table('lineups2020')
resp = lineups_table.scan()
lineups = resp['Items']

for player in lineups:
    lineups_table.update_item(
        Key={
            'name+nrl+xrl+round': player['name+nrl+xrl+round']
        },
        UpdateExpression="set score = :v",
        ExpressionAttributeValues={
            ':v': 0
        }
    )