import boto3
from boto3.dynamodb.conditions import Key, Attr
import botocore.exceptions
import hmac
import hashlib
import base64
import json

USER_POOL_ID = 'ap-southeast-2_X405VGEIl'
CLIENT_ID = '53irugvhakp6kd5cmd2o75kn'

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
table = dynamodb.Table('XRL2021')

def lambda_handler(event, context):
    data = json.loads(event['body'])
    print(data)    
    
    username = data['username'].lower()
    password = data['password']
    # hash = hashlib.sha256(str(password).encode('utf-8')).hexdigest()
    team_name = data["team_name"]  
    team_short = data["team_short"]
    homeground = data["homeground"]
    # existing_users = table.scan()['Items']
    existing_users = table.query(
        IndexName='sk-data-index',
        KeyConditionExpression=Key('sk').eq('DETAILS') & Key('data').begins_with('NAME#')
    )['Items']
    print('Checking against existing users')
    error = False
    message = ''
    for user in existing_users:
        if user['username'] == username:
            error = True
            message += 'Username is already taken. '
        if user['team_name'] == team_name:
            error = True
            message += 'Team name is already taken. '
        if user['team_short'] == team_short:
            error = True
            message += 'Team acronym is already taken. '
        if user['homeground'] == homeground:
            error = True
            message += 'Homeground name is already taken. '
    if error:
        print("Error: One or more names already taken")
        return {'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps({"error": message})
        }
    client = boto3.client('cognito-idp')    
    try:
        client.sign_up(
            ClientId=CLIENT_ID,
            Username=username,
            Password=password
        )
        table.put_item(
            Item={
                'pk': 'USER#' + username,
                'sk': 'KEY',
                'data': password
            }
        )
    except client.exceptions.UsernameExistsException as e:
        return {'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps({"error": "This username already exists"})
        }   
    except client.exceptions.InvalidPasswordException as e: 
        return {'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps({"error": "Password should have Caps,\
                          Special chars, Numbers"})
        }             
    except client.exceptions.UserLambdaValidationException as e:
        return {'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps({"error": "Email already exists"})
        }   
    except Exception as e:
        return {'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps({"error": str(e)})
        }   
    try:       
        table.put_item(Item={
            'pk': 'NEWUSER#' + username,
            'sk': 'TEMP',
            'data': 'NAME#' + team_short,
            "username": username,
            "team_name": team_name,
            "team_short": team_short,
            "homeground": homeground,
            # "powerplays": 3,
            # "stats": {
            #     "wins": 0,
            #     "draws": 0,
            #     "losses": 0,
            #     "for": 0,
            #     "against": 0,
            #     "points": 0
            # },                
            # "inbox": [],
            # "players_picked": 0,
            # "provisional_drop": '',
            # "waiver_preferences": [],
            # "waiver_rank": 0
        })
    except Exception as e:
        return {'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps({"error": str(e)})
        }       
    return {'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps({"success": f"{username} signed up successfully"})
            }