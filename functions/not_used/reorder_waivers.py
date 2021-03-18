import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import date, datetime
import json
import decimal
import sys

log = open('/home/james/Projects/XRL/functions/logs/process_waivers.log', 'a')
sys.stdout = log
print(f"Script executing at {date.today().strftime('%d/%m/%y')}")

dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
squads_table = dynamodbResource.Table('players2020')
users_table = dynamodbResource.Table('users2020')
waivers_table = dynamodbResource.Table('transfers2020')

users = users_table.scan()['Items']

waiver_order = sorted(users, key=lambda u: u['waiver_rank'])