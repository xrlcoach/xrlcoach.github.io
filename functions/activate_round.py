import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime
import sys

log = open('/home/james/Projects/XRL/functions/logs/activate_round.log', 'a')
sys.stdout = log
print(f"Script executing at {datetime.now()}")

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
# rounds_table = dynamodb.Table('rounds2020')
table = dynamodb.Table('XRL2021')

#Get all rounds that are not yet active
resp = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('STATUS') & Key('data').eq('ACTIVE#false')
)
#Get the next non-active round
round_number = min([r['round_number'] for r in resp['Items']])
print(f"Next Round: {round_number}. Setting to 'active'")
#Update that round to active
table.update_item(
    Key={
        'pk': 'ROUND#' + str(round_number),
        'sk': 'STATUS'
    },
    UpdateExpression="set #D=:d, active=:t",
    ExpressionAttributeNames={
        '#D': 'data'
    },
    ExpressionAttributeValues={
        ':d': 'ACTIVE#true',
        ':t': True
    }
)
print(f"Round {round_number} now active.")
