import boto3
import hmac
import hashlib
import base64
import json

USER_POOL_ID = 'ap-southeast-2_X405VGEIl'
CLIENT_ID = '53irugvhakp6kd5cmd2o75kn'
client = None

def initiate_auth(username, password):
    try:
        resp = client.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            AuthFlow='ADMIN_NO_SRP_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password
            },
            ClientMetadata={
                'username': username,
                'password': password
            })
    except client.exceptions.NotAuthorizedException as e:
        return None, "The username or password is incorrect"
    except client.exceptions.UserNotFoundException as e:
        return None, "The username or password is incorrect"
    except Exception as e:
        print(e)
        return None, "Unknown error"
    return resp
    
    
def refresh_auth(username, refresh_token):
    try:
        resp = client.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            AuthFlow='REFRESH_TOKEN_AUTH',
            AuthParameters={
                'REFRESH_TOKEN': refresh_token,
                #'SECRET_HASH': get_secret_hash(username)
            },
            ClientMetadata={            })
    except client.exceptions.NotAuthorizedException as e:
        return None, "The username or password is incorrect"
    except client.exceptions.UserNotFoundException as e:
        return None, "The username or password is incorrect"
    except Exception as e:
        print(e)
        return None, "Unknown error"
    return resp, None
    
def lambda_handler(event, context):
    global client
    if client == None:
        client = boto3.client('cognito-idp')

    data = json.loads(event['body'])
    print(data)

    username = data['username']    
    
    resp = initiate_auth(username, data['password'])
    if resp[0] != None:
        data = resp[0]['AuthenticationResult']['IdToken']
        print(data)
    
    else:
        data = '{"error": ' + resp[1] + '}'   
    
    response = {
            'statusCode': 200,
            'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': 'https://xrlcoach.github.io',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Credentials': 'true',
            },
            'body': json.dumps(data)
        }    
            
    return response