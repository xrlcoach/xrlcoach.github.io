import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime
import sys

log = open('activate_round.log', 'a')
sys.stdout = log
print(f"Script executing at {datetime.now()}")

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
rounds_table = dynamodb.Table('rounds2020')

resp = rounds_table.scan(
    FilterExpression=Attr('active').eq(False)
)
round_number = min([r['round_number'] for r in resp['Items']])
print(f"Next Round: {round_number}. Setting to 'active'")

rounds_table.update_item(
    Key={
        'round_number': round_number
    },
    UpdateExpression="set active=:t",
    ExpressionAttributeValues={
        ':t': True
    }
)
print(f"Round {round_number} now active.")
