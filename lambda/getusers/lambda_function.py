import json
import boto3
from boto3.dynamodb.conditions import Key, Attr
import decimal
import hashlib
import base64

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
# table = dynamodb.Table('users2020')
table = dynamodb.Table('XRL2021')

def lambda_handler(event, context):
    try:
        method = event["httpMethod"]
        print("Method is " + method)
        if method == 'GET':
            # resp = table.scan()
            resp = table.query(
                IndexName='sk-data-index',
                KeyConditionExpression=Key('sk').eq('DETAILS') & Key('data').begins_with('NAME#')
            )
            print("Return users data")
            return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Credentials': True,
                'Set-Cookie': 'testCookie=ThisIsATestCookie'
                },
                'body': json.dumps(replace_decimals(resp['Items']))
            }
        if method == 'POST':
            body = json.loads(event['body'])
            operation = body['operation']
            print("Operation is " + operation)
            if operation == 'get_user':
                id_token = event['headers']['Authorization']
                # print(id_token)        
                payload = id_token.split('.')[1]
                # print(payload)
                decoded = base64.b64decode(payload + '=======')
                # print(decoded)
                user = json.loads(decoded)['cognito:username']
                print(user)            
                # response = table.get_item(Key={'username': user})
                response = table.get_item(
                    Key={
                        'pk': 'USER#' + user,
                        'sk': 'DETAILS'
                    }
                )
                print(response['Item'])        
                return {
                    'statusCode': 200,
                    'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    },
                    'body': json.dumps(replace_decimals(response['Item']))
                }
            if operation == 'update_inbox':
                print("Updating user inbox")
                # table.update_item(
                #     Key={
                #         'username': body['username']
                #     },
                #     UpdateExpression="set inbox=:i",
                #     ExpressionAttributeValues={
                #         ':i': body['inbox']
                #     }
                # )
                table.update_item(
                    Key={
                        'pk': 'USER#' + body['username'],
                        'sk': 'DETAILS'
                    },
                    UpdateExpression="set inbox=:i",
                    ExpressionAttributeValues={
                        ':i': body['inbox']
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
                    'body': json.dumps({"success": "User inbox updated"})
                }
    except Exception as e:
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