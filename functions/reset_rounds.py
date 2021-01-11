import boto3

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
rounds_table = dynamodb.Table('rounds2020')

all_rounds = rounds_table.scan()['Items']

for r in all_rounds:
    fixtures = r['fixtures']
    for match in fixtures:
        match['home_score'] = 0
        match['away_score'] = 0
    if r['round_number'] == 1:
        rounds_table.update_item(
            Key={
                'round_number': r['round_number']
            },
            UpdateExpression="set active=:a, in_progress=:ip, completed=:c, fixtures=:f",
            ExpressionAttributeValues={
                ':a': True,
                ':ip': False,
                ':c': False,
                ':f': fixtures
            }
        )
    else:
        rounds_table.update_item(
            Key={
                'round_number': r['round_number']
            },
            UpdateExpression="set active=:a, in_progress=:ip, completed=:c, fixtures=:f",
            ExpressionAttributeValues={
                ':a': False,
                ':ip': False,
                ':c': False,
                ':f': fixtures
            }
        )