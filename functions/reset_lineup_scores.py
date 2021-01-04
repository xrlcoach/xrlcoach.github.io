import boto3
import sys
from datetime import datetime

# log = open('reset_lineup_scores.log', 'a')
# sys.stdout = log
# print(f"Script executing at {datetime.now()}")

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
lineups_table = dynamodb.Table('lineups2020')
resp = lineups_table.scan()
lineups = resp['Items']

for player in lineups:
    lineups_table.update_item(
        Key={
            'name+nrl+xrl+round': player['name+nrl+xrl+round']
        },
        UpdateExpression="set score=:v, played_nrl=:n, played_xrl=:x",
        ExpressionAttributeValues={
            ':v': 0,
            ':n': False,
            ':x': False
        }
    )