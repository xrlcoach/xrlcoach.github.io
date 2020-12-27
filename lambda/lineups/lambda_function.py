import json
import boto3
import base64
from boto3.dynamodb.conditions import Key, Attr
import decimal


dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
lineup_table = dynamodbResource.Table('lineups2020')
user_table = dynamodbResource.Table('users2020')
round_table = dynamodbResource.Table('rounds2020')


def lambda_handler(event, context):
    method = event["httpMethod"]
    print(f"Method is {method}")
    id_token = event['headers']['Authorization']
    if id_token:
        payload = id_token.split('.')[1]
        decoded = base64.b64decode(payload + '=======')
        username = json.loads(decoded)['cognito:username']
        print(f"User: {username}")
        resp = user_table.get_item(Key={'username': username})
        user = resp['Item']
        team_short = user['team_short']
        print(f"XRL Team: {team_short}")
        resp = round_table.scan(
            FilterExpression=Attr('active').eq(False)
        )
        round_number = min(r['round_number'] for r in resp['Items'])
        print(f"Round Number: {round_number}")
        existing_lineup = lineup_table.scan(
                FilterExpression=Attr('xrlTeam+round').eq(team_short+str(round_number))
                )
    if method == 'GET':
        if id_token:
            if len(existing_lineup['Items']) > 0:
                print("Existing lineup found. Returning player list.")
            else:
                print("No lineup found")
            return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(replace_decimals(existing_lineup['Items']))
            }
        else:
            params = event["queryStringParameters"]
            print(params)
            if 'specific' in params.keys():
                team_and_round = params['specific']
                print(f'Specific lineup requested is {team_and_round}, querying table')
                resp = lineup_table.scan(
                    FilterExpression=Attr('xrlTeam+round').eq(team_and_round)
                )
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(replace_decimals(resp['Items']))
                }
    if method == 'POST':
        lineup = json.loads(event['body'])
        print("Lineup: " + str(lineup))
        positions = {
            "fullback": "Back",
            "winger1": "Back",
            "centre1": "Back",
            "centre2": "Back",
            "winger2": "Back",
            "five_eighth": "Playmaker",
            "halfback": "Playmaker",
            "hooker": "Playmaker",
            "prop1": "Forward",
            "lock": "Forward",
            "prop2": "Forward",
            "row1": "Forward",
            "row2": "Forward",
            "int1": "Forward",
            "int2": "Forward",
            "int3": "Forward",
            "int4": "Forward",
            }
        print("Writing lineup to table")        
        for player in existing_lineup['Items']:
            lineup_table.delete_item(
                Key={
                    'name+club': player['name+club'],
                    'xrlTeam+round': team_short + str(round_number)
                }
            )
        for player in lineup:
            lineup_table.put_item(
                Item={
                    'name+club': player['name+club'],
                    'xrlTeam+round': team_short + str(round_number),
                    'position_specific': player['position'],
                    'position_general': positions[player['position']],
                    'captain': player['captain'],
                    'vice': player['vice'],
                    'kicker': player['kicker'],
                    'backup_kicker': player['backupKicker']
                }
            )
        print("DB write complete")
        return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                },
                'body': json.dumps({"message": "Lineup saved successfully"})
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