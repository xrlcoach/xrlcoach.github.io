import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import date, datetime
import json
import decimal

dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
squads_table = dynamodbResource.Table('players2020')
users_table = dynamodbResource.Table('users2020')
transfers_table = dynamodbResource.Table('transfers2020')

def lambda_handler(event, context):
    method = event["httpMethod"]
    print("Method is " + method)
    if method == 'GET':
        try:
            print("Scanning waivers table")
            resp = transfers_table.scan()
            print("Returning data")
            return {
                    'statusCode': 200,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps(replace_decimals(resp['Items']))
                }
        except Exception as e:
            print("ERROR: " + str(e))
            return {
                    'statusCode': 200,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps({"error": str(e)})
                }
    if method == 'POST':
        body = json.loads(event['body'])
        operation = body['operation']
        print("Operation is " + operation)
        if operation == 'update_preferences':
            try:                
                username = body['username']
                players = body['preferences']
                provisional_drop = None if body['provisional_drop'] == 'None' else body['provisional_drop']
                print(f"Updating {username}'s waiver preferences to: {str(players)}")
                users_table.update_item(
                    Key={
                        'username': username
                    },
                    UpdateExpression="set waiver_preferences=:p, provisional_drop=:pd",
                    ExpressionAttributeValues={
                        ':p': players,
                        ':pd': provisional_drop
                    }
                )
                print("Update complete")
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"success": username + "'s waiver preferences updated"})
                    }
            except Exception as e:
                print("ERROR: " + str(e))
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"error": str(e)})
                    }
                   

def replace_decimals(obj):
    if isinstance(obj, list):
        for i in range(len(obj)):
            obj[i] = replace_decimals(obj[i])
        return obj
    elif isinstance(obj, dict):
        for k in obj.keys():
            obj[k] = replace_decimals(obj[k])
        return obj
    elif isinstance(obj, decimal.Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    else:
        return obj



