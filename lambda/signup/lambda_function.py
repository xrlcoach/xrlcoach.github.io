import boto3
import botocore.exceptions
import hmac
import hashlib
import base64
import json

USER_POOL_ID = 'ap-southeast-2_X405VGEIl'
CLIENT_ID = '53irugvhakp6kd5cmd2o75kn'

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
table = dynamodb.Table('users2020')

def lambda_handler(event, context):
    data = json.loads(event['body'])
    print(data)    
    
    username = data['username'].lower()
    password = data['password']
    hash = hashlib.sha256(str(password).encode('utf-8')).hexdigest()
    team_name = data["team_name"]  
    team_short = data["team_short"]
    homeground = data["homeground"]
    client = boto3.client('cognito-idp')    
    try:
        resp = client.sign_up(
            ClientId=CLIENT_ID,
            Username=username,
            Password=password)
    except client.exceptions.UsernameExistsException as e:
        return {"error": False, 
               "success": True, 
               "message": "This username already exists", 
               "data": None}    
    except client.exceptions.InvalidPasswordException as e:        
        return {"error": False, 
               "success": True, 
               "message": "Password should have Caps,\
                          Special chars, Numbers", 
               "data": None}    
    except client.exceptions.UserLambdaValidationException as e:
        return {"error": False, 
               "success": True, 
               "message": "Email already exists", 
               "data": None}
    except Exception as e:
        return {"error": False, 
                "success": True, 
                "message": str(e), 
               "data": None}
    try:
        with table.batch_writer() as batch:
            batch.put_item(Item={
                "username": username,
                "password": hash,
                "team_name": team_name,
                "team_short": team_short,
                "homeground": homeground,
                "powerplays": 2,
                "stats": {
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                    "for": 0,
                    "against": 0,
                    "points": 0
                }
            })
    except Exception as e:
        return {"error": False, 
                "success": True, 
                "message": str(e), 
               "data": None}
    
    return {'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            'body': json.dumps(f"{username} signed up successfully")
            }