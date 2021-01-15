import boto3
import sys
from datetime import datetime

# log = open('reset_table.log', 'a')
# sys.stdout = log
# print(f"Script executing at {datetime.now()}")

clean_stats = {
    'wins': 0,
    'draws': 0,
    'losses': 0,
    'for': 0,
    'against': 0,
    'points': 0
}

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
users_table = dynamodb.Table('users2020')
resp = users_table.scan()
users = resp['Items']

for user in users:
    users_table.update_item(
        Key={
            'username': user['username']
        },
        UpdateExpression="set powerplays=:p, stats=:s, captain_counts=:cc",
        ExpressionAttributeValues={
            ':p': 3,
            ':s': clean_stats,
            ':cc': {}
        }
    )