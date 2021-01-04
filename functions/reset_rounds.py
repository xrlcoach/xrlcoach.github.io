import boto3

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
rounds_table = dynamodb.Table('rounds2020')

for i in range(21):
    rounds_table.update_item(
        Key={
            'round_number': i + 1
        },
        UpdateExpression="set active=:a, in_progress=:ip, completed=:c",
        ExpressionAttributeValues={
            ':a': False,
            ':ip': False,
            ':c': False
        }
    )