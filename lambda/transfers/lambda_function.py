import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import date, datetime
import json
import decimal

dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
squads_table = dynamodbResource.Table('players2020')
users_table = dynamodbResource.Table('users2020')
transfers_table = dynamodbResource.Table('transfers2020')
trades_table = dynamodbResource.Table('trades2020')
players_table = dynamodbResource.Table('players2020')
rounds_table = dynamodbResource.Table('rounds2020')

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
        if operation == 'trade_offer':
            try:
                print('Writing offer to trades table')
                trades_table.put_item(
                    Item={
                        'offer_id': body['offered_by'] + '_' + str(datetime.now()),
                        'datetime': datetime.now().strftime('%c'),
                        'offered_by': body['offered_by'],
                        'offered_to': body['offered_to'],
                        'players_offered': body['players_offered'],
                        'players_wanted': body['players_wanted'],
                        'powerplays_offered': body['powerplays_offered'],
                        'powerplays_wanted': body['powerplays_wanted'],
                        'offer_status': 'Pending'
                    }
                )
                print('Sending message to user')
                user_offered_by = users_table.get_item(Key={'username': body['offered_by']})["Item"]
                user_offered_to = users_table.get_item(Key={'username': body['offered_to']})['Item']
                user_offered_to['inbox'].append({
                    'sender': user_offered_by['team_name'],
                    'datetime': datetime.now().strftime('%c'),
                    'subject': 'Trade Offer',
                    'message': user_offered_by['team_name'] + " has offered you a trade. You can view the offer in the Transfer Centre."
                })
                users_table.update_item(
                    Key={'username': user_offered_to['username']},
                    UpdateExpression="set inbox=:i",
                    ExpressionAttributeValues={':i': user_offered_to['inbox']}
                )
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"success": "trade offer recorded"})
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
        if operation == 'get_user_offers':
            try:
                print(f"Getting {body['username']}'s trade offers from database.")
                offers = trades_table.scan(
                    FilterExpression=Attr('offered_by').eq(body['username']) | Attr('offered_to').eq(body['username'])
                )['Items']
                print('Returning data.')
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(replace_decimals(offers))
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
        if body['operation'] == 'process_trade':
            try:
                rounds = rounds_table.scan(
                    FilterExpression=Attr('active').eq(True)
                )['Items']
                round_number = max([r['round_number'] for r in rounds])
                outcome = body['outcome']
                offer = trades_table.get_item(Key={'offer_id': body['offer_id']})['Item']
                user_offered_by = users_table.get_item(Key={'username': offer['offered_by']})["Item"]
                user_offered_to = users_table.get_item(Key={'username': offer['offered_to']})['Item']
                if outcome == 'Accepted':
                    print(f"{user_offered_to} has accepted the trade offer from {user_offered_by}. Checking squad sizes.")
                    user_offered_by_squad = players_table.scan(
                        FilterExpression=Attr('xrl_team').eq(user_offered_by['team_short'])
                    )['Items']
                    user_offered_to_squad = players_table.scan(
                        FilterExpression=Attr('xrl_team').eq(user_offered_to['team_short'])
                    )['Items']
                    if len(user_offered_by_squad) - len(offer['players_offered']) + len(offer['players_wanted']) > 18:
                        raise Exception(f"The trade would result in {user_offered_by['team_name']} having too many players.")
                    if len(user_offered_to_squad) - len(offer['players_wanted']) + len(offer['players_offered']) > 18:
                        raise Exception(f"The trade would result in {user_offered_to['team_name']} having too many players.")
                    print("Squad sizes ok. Transferring players.")
                    for player_id in offer['players_offered']:
                        players_table.update_item(
                                    Key={
                                        'player_id': player_id,
                                    },
                                    UpdateExpression="set xrl_team=:x",
                                    ExpressionAttributeValues={
                                        ':x': user_offered_to['team_short']
                                    }
                                )
                        transfers_table.put_item(
                            Item={
                                'transfer_id': user_offered_to['username'] + '_' + str(datetime.now()),
                                'user': user_offered_to['username'],                        
                                'datetime': datetime.now().strftime("%c"),
                                'type': 'Trade',
                                'seller': user_offered_by['username'],
                                'round_number': round_number,
                                'player_id': player_id
                            }
                        )
                    for player_id in offer['players_wanted']:
                        players_table.update_item(
                                    Key={
                                        'player_id': player_id,
                                    },
                                    UpdateExpression="set xrl_team=:x",
                                    ExpressionAttributeValues={
                                        ':x': user_offered_by['team_short']
                                    }
                                )
                        transfers_table.put_item(
                            Item={
                                'transfer_id': user_offered_by['username'] + '_' + str(datetime.now()),
                                'user': user_offered_by['username'],                        
                                'datetime': datetime.now().strftime("%c"),
                                'type': 'Trade',
                                'seller': user_offered_to['username'],
                                'round_number': round_number,
                                'player_id': player_id
                            }
                        )
                    print("Players transferred. Updating powerplays.")
                    users_table.update_item(Key={'username': user_offered_by['username']},
                        UpdateExpression="set powerplays=powerplays+:pw-:po", ExpressionAttributeValues={
                            ':pw': offer['powerplays_wanted'],
                            ':po': offer['powerplays_offered']
                            })
                    users_table.update_item(Key={'username': user_offered_to['username']},
                        UpdateExpression="set powerplays=powerplays+:po-:pw", ExpressionAttributeValues={
                            ':pw': offer['powerplays_wanted'],
                            ':po': offer['powerplays_offered']
                            })                 
                    user_offered_by_message = {
                        "sender": user_offered_to['team_name'],
                        "datetime": datetime.now().strftime("%c"),
                        "subject": "Trade Accepted",
                        "message": "You've got a deal."
                    }
                else:
                    print(f"{user_offered_to} has rejected the trade offer from {user_offered_by}.")
                    user_offered_by_message = {
                        "sender": user_offered_to['team_name'],
                        "datetime": datetime.now().strftime("%c"),
                        "subject": "Trade Rejected",
                        "message": "Tell him he's dreaming."
                    }
                print('Updating offer status to ' + outcome)
                trades_table.update_item(
                        Key={'offer_id': offer['offer_id']},
                        UpdateExpression="set offer_status=:s",
                        ExpressionAttributeValues={':s': outcome}
                    )
                print('Sending message to offering user.')
                user_offered_by['inbox'].append(user_offered_by_message)
                users_table.update_item(Key={'username': user_offered_by['username']},
                    UpdateExpression="set inbox=:i", ExpressionAttributeValues={':i': user_offered_by['inbox']})
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"success": "Trade processed"})
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



