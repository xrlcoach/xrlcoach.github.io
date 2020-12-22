import json
import boto3
import base64
from boto3.dynamodb.conditions import Key, Attr


dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
lineup_table = dynamodbResource.Table('lineups2020')
user_table = dynamodbResource.Table('users2020')
round_table = dynamodbResource.Table('rounds2020')


def lambda_handler(event, context):
    method = event["httpMethod"]
    print(f"Method is {method}")
    id_token = event['headers']['Authorization']
    payload = id_token.split('.')[1]
    decoded = base64.b64decode(payload + '=======')
    username = json.loads(decoded)['cognito:username']
    print(f"User: {username}")
    resp = user_table.get_item(Key={'username': username})
    user = resp['Item']
    team_short = user['team_short']
    print(f"XRL Team: {team_short}")
    resp = round_table.scan(
        FilterExpression=Attr('open').eq(True)
    )
    round_number = resp['Items'][0]['round_number']
    print(f"Round Number: {round_number}")
    if method == 'GET':
        existing_lineup = lineup_table.scan(
            FilterExpression=Attr('xrlTeam+round').eq(team_short+str(round_number))
            )
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
                    'body': json.dumps((existing_lineup['Items']))
        }
    if method == 'POST':
        lineup = json.loads(event['body'])
        print("Lineup: " + str(lineup))
        positions = {
            "fullback": "back",
            "winger1": "back",
            "centre1": "back",
            "centre2": "back",
            "winger2": "back",
            "five_eighth": "playmaker",
            "halfback": "playmaker",
            "hooker": "playmaker",
            "prop1": "forward",
            "lock": "forward",
            "prop2": "forward",
            "row1": "forward",
            "row2": "forward"
            }
        print("Writing lineup to table")
        with lineup_table.batch_writer() as batch:
            for player in lineup:
                batch.delete_item(
                    Key={
                        'name+club': player['name+club'],
                        'xrlTeam+round': team_short + str(round_number)
                    }
                )
                batch.put_item(
                    Item={
                        'name+club': player['name+club'],
                        'xrlTeam+round': team_short + str(round_number),
                        'position_specific': player['position'],
                        'position_general': positions[player['position']]
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