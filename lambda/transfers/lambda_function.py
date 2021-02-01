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
waivers_table = dynamodbResource.Table('waivers2020')
lineups_table = dynamodbResource.Table('lineups2020')

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
        if operation == 'withdraw_trade':
            try:
                trades_table.update_item(
                    Key={'offer_id': body['offer_id']},
                    UpdateExpression="set offer_status=:w",
                    ExpressionAttributeValues={':w': 'Withdrawn'}
                )
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps({"success": "Trade withdrawn"})
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

        if operation == 'process_trade':
            try:
                rounds = rounds_table.scan(
                    FilterExpression=Attr('active').eq(True)
                )['Items']
                round_number = max([r['round_number'] for r in rounds])
                not_in_progress_rounds = rounds_table.scan(
                    FilterExpression=Attr('in_progress').eq(False)
                )['Items']
                next_round_number = min([r['round_number'] for r in not_in_progress_rounds])
                outcome = body['outcome']
                offer = trades_table.get_item(Key={'offer_id': body['offer_id']})['Item']
                if offer['offer_status'] != 'Pending':
                    raise Exception("Trade has already been processed/withdrawn.")
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
                    pending_trades = trades_table.scan(
                        FilterExpression=Attr('offer_status').eq('Pending')
                    )['Items']
                    pending_trades = [t for t in pending_trades if t['offer_id'] != offer['offer_id']]
                    for player_id in offer['players_offered']:
                        pending_trades = [t for t in pending_trades if t['offer_status'] == 'Pending']
                        players_table.update_item(
                                    Key={
                                        'player_id': player_id,
                                    },
                                    UpdateExpression="set xrl_team=:x",
                                    ExpressionAttributeValues={
                                        ':x': user_offered_to['team_short']
                                    }
                                )
                        player_to_drop = players_table.get_item(
                            Key={
                                'player_id': player_id
                            }
                        )['Item']
                        lineups_table.delete_item(
                            Key={
                                'name+nrl+xrl+round': player_to_drop['player_name'] + ';' + player_to_drop['nrl_club'] + ';' + user_offered_by['team_short'] + ';' + str(next_round_number)
                            }
                        )
                        for trade in pending_trades:
                            if player_id in trade['players_offered'] or player_id in trade['players_wanted']:
                                print(f"Player with ID {player_id} was part of offer with ID {trade['offer_id']}. Withdrawing that trade offer.")
                                trade['offer_status'] = 'Withdrawn'
                                trades_table.update_item(
                                    Key={
                                        'offer_id': trade['offer_id']
                                    },
                                    UpdateExpression="set offer_status=:c",
                                    ExpressionAttributeValues={':c': 'Withdrawn'}
                                )
                                withdrawn_offer_user = users_table.get_item(
                                    Key={'username': trade['offered_by']}
                                )['Item']
                                withdrawn_offer_target = users_table.get_item(
                                    Key={'username': trade['offered_to']}
                                )['Item']
                                withdrawn_offer_user['inbox'].append({
                                    "sender": 'XRL Admin',
                                    "datetime": datetime.now().strftime("%c"),
                                    "subject": "Trade Offer Withdrawn",
                                    "message": f"Your trade offer to {withdrawn_offer_target['team_name']} was withdrawn because one of the players signed for another club."
                                })
                                users_table.update_item(
                                    Key={'username': withdrawn_offer_user['username']},
                                    UpdateExpression="set inbox=:i",
                                    ExpressionAttributeValues={':i': withdrawn_offer_user['inbox']}
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
                        pending_trades = [t for t in pending_trades if t['offer_status'] == 'Pending']
                        players_table.update_item(
                                    Key={
                                        'player_id': player_id,
                                    },
                                    UpdateExpression="set xrl_team=:x",
                                    ExpressionAttributeValues={
                                        ':x': user_offered_by['team_short']
                                    }
                                )
                        player_to_drop = players_table.get_item(
                            Key={
                                'player_id': player_id
                            }
                        )['Item']
                        lineups_table.delete_item(
                            Key={
                                'name+nrl+xrl+round': player_to_drop['player_name'] + ';' + player_to_drop['nrl_club'] + ';' + user_offered_to['team_short'] + ';' + str(next_round_number)
                            }
                        )
                        for trade in pending_trades:
                            if player_id in trade['players_offered'] or player_id in trade['players_wanted']:
                                print(f"Player with ID {player_id} was part of offer with ID {trade['offer_id']}. Withdrawing that trade offer.")
                                trade['offer_status'] = 'Withdrawn'
                                trades_table.update_item(
                                    Key={
                                        'offer_id': trade['offer_id']
                                    },
                                    UpdateExpression="set offer_status=:c",
                                    ExpressionAttributeValues={':c': 'Withdrawn'}
                                )
                                withdrawn_offer_user = users_table.get_item(
                                    Key={'username': trade['offered_by']}
                                )['Item']
                                withdrawn_offer_target = users_table.get_item(
                                    Key={'username': trade['offered_to']}
                                )['Item']
                                withdrawn_offer_user['inbox'].append({
                                    "sender": 'XRL Admin',
                                    "datetime": datetime.now().strftime("%c"),
                                    "subject": "Trade Offer Withdrawn",
                                    "message": f"Your trade offer to {withdrawn_offer_target['team_name']} was withdrawn because one of the players signed for another club."
                                })
                                users_table.update_item(
                                    Key={'username': withdrawn_offer_user['username']},
                                    UpdateExpression="set inbox=:i",
                                    ExpressionAttributeValues={':i': withdrawn_offer_user['inbox']}
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
                        UpdateExpression="set powerplays=powerplays+:pp", ExpressionAttributeValues={
                            ':pp': offer['powerplays_wanted'] - offer['powerplays_offered']                           
                            })
                    users_table.update_item(Key={'username': user_offered_to['username']},
                        UpdateExpression="set powerplays=powerplays+:pp", ExpressionAttributeValues={
                            ':pp': offer['powerplays_offered'] - offer['powerplays_wanted']
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
        if operation == 'get_waiver_reports':
            try:
                data = waivers_table.scan()['Items']
                return {
                        'statusCode': 200,
                        'headers': {
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                        },
                        'body': json.dumps(data)
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



