import json
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
table = dynamodb.Table('XRL2020')

def lambda_handler(event, context):

    print(str(event))    

    if 'userName' in event.keys():
        print(f"Confirming user: {event['userName']}")
        print("Retrieving temporary user record...")
        new_user = table.get_item(
            Key={
                'pk': 'NEWUSER#' + event['userName'],
                'sk': 'TEMP'
            }
        )['Item']
        print(str(new_user))
        existing_users = table.query(
            IndexName='sk-data-index',
            KeyConditionExpression=Key('sk').eq('DETAILS') & Key('data').begins_with('NAME#')
        )['Items']
        highest_waiver_rank = max([u['waiver_rank'] for u in existing_users])
        print("Adding new user record to db...")
        table.put_item(
            Item={
                'pk': 'USER#' + new_user['username'],
                'sk': 'DETAILS',
                'data': new_user['data'],
                "username": new_user['username'],
                "team_name": new_user['team_name'],
                "team_short": new_user['team_short'],
                "homeground": new_user['homeground'],
                "powerplays": 3,
                "stats": {
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                    "for": 0,
                    "against": 0,
                    "points": 0
                },                
                "inbox": [],
                "players_picked": 0,
                "provisional_drop": '',
                "waiver_preferences": [],
                "waiver_rank": highest_waiver_rank + 1
            }
        )
        print("Removing temp record...")
        table.delete_item(
            Key={
                'pk': new_user['pk'],
                'sk': 'TEMP'
            }
        )
        print("Finished")
    
    return event
