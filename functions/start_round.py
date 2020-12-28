import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
rounds_table = dynamodb.Table('rounds2020')

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
print(f"Round {round_number} now in progress. Setting next round to active...")
rounds_table.update_item(
    Key={
        'round_number': round_number + 1
    },
    UpdateExpression="set active=:t",
    ExpressionAttributeValues={
        ':t': True
    }
)
print(f"Round {round_number + 1} now active. Process complete.")