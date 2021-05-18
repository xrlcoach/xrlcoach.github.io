from datetime import datetime, date, time
import boto3
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal
from selenium import webdriver
import math

from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.expected_conditions import presence_of_element_located
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import NoSuchElementException

days_of_week = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

def parse_time(input_time):
    # Split time string, e.g. '7:50pm'
    time_split = input_time.split(':')
    # Convert hour and minute to int
    time_hours = int(time_split[0])
    time_minutes = int(time_split[1][:2])
    am_pm = time_split[1][2:]
    # Add twelve to pm hour
    if am_pm == 'pm':
        time_hours += 12
    # return as dict
    return {
        'hour': time_hours,
        'minute': time_minutes
    }

def convert_time(day, parsed_time, start_round = False, end_time = False):
    converted_day = day
    converted_time = parsed_time.copy()
    # Get number of day, e.g. Sunday = 0
    day_number = days_of_week.index(day)
    # Take away 15 minutes from start time if making a cron expression for start-round rule
    # Take into account if doing so puts time an hour and/or day back
    if start_round:
        converted_time['minute'] -= 15
        if converted_time['minute'] < 0:
            converted_time['minute'] += 60
            converted_time['hour'] -= 1
            if converted_time['hour'] < 0:
                converted_time['hour'] += 24
                day_number -= 1
                converted_day = days_of_week[day_number]
    # If the time is for the last match, add two hours, but don't go into next day
    if end_time:
        converted_time['hour'] = min(converted_time['hour'] + 3, 23)      
    
    return {
        'day': converted_day, 
        'hour': converted_time['hour'],
        'minute': converted_time['minute']
    }


def create_GMT_cron_expression(day, start_time, last_match = None, start_round = False):
    # Get GMT for start time
    start_GMT = convert_time(day, start_time, start_round=start_round)    
    # If no last match (e.g. this is one-off event), return cron expression with start time
    if last_match == None:
        return f"cron({start_GMT['minute']} {start_GMT['hour']} ? * {start_GMT['day'][:3]} *)"
    # Get GMT for 2 hours passed the start of last match
    end_GMT = convert_time(day, last_match, end_time=True)
    # Make cron expression for every 10 minutes from start hour to end hour
    return f"cron(*/10 {start_GMT['hour']}-{end_GMT['hour']} ? * {start_GMT['day'][:3]} *)"

def lambda_handler(event, context):
    # Start timer to see how long things take
    start = datetime.now()
    print(f"Script executing at {start}")

    # Initiate eventbridge connection
    eventbridge = boto3.client('events')

    # Config and initiate web driver
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--single-process')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.binary_location = f"/opt/headless-chromium"
    driver = webdriver.Chrome(
        executable_path = f"/opt/chromedriver",
        chrome_options=chrome_options
    )
    print("Connecting to www.nrl.com/draw")
    driver.get('https://www.nrl.com/draw')

    round_number = driver.find_element_by_css_selector(
        "button[class='filter-round__button filter-round__button--dropdown']"
        ).text
    round_number = round_number.split()
    print(round_number)
    number = round_number[1]
    round_number = "-".join(round_number)

    match_dates = driver.find_elements_by_class_name("match-header__title")
    match_dates = [m.text.split()[0] for m in match_dates]

    first_match_date = match_dates[0]
    last_match_date = match_dates[-1]

    days_with_matches = set(match_dates)

    match_times = driver.find_elements_by_tag_name('time')
    match_times = [parse_time(m.text) for m in match_times]

    first_match_time = match_times[0]
    last_match_time = match_times[-1]

    match_dates_plus_times = []
    for i in range(0, len(match_dates)):
        match_dates_plus_times.append({
            'date': match_dates[i],
            'time': match_times[i]
        });

    match_days = {}

    for day in days_with_matches:
        match_days[day] = [m['time'] for m in match_dates_plus_times if m['date'] == day]
    print(match_days)

    start_round_cron = create_GMT_cron_expression(first_match_date, first_match_time, start_round=True)
    print('Start round: ')
    print(start_round_cron)

    eventbridge.put_rule(
        Name='start-round',
        ScheduleExpression=start_round_cron,
    )

    for day, matches in match_days.items():
        cron_expression = create_GMT_cron_expression(day, matches[0], last_match=(matches[-1] if len(matches) > 0 else matches[0]))
        print(day)
        print(cron_expression)
        eventbridge.put_rule(
            Name=f"stat-scraping-{day.lower()}",
            ScheduleExpression=cron_expression
        )
        eventbridge.enable_rule(Name=f"stat-scraping-{day.lower()}")

    if 'THURSDAY' not in match_days.keys():
        eventbridge.disable_rule(Name='stat-scraping-thursday')
    if 'MONDAY' not in match_days.keys():
        eventbridge.disable_rule(Name='stat-scraping-monday')
        eventbridge.put_rule(
            Name='stats-to-sheet',
            ScheduleExpression='cron(0 2 ? * MON *)'
        )
        eventbridge.put_rule(
            Name='finalise-stats',
            ScheduleExpression='cron(0 7 ? * MON *)'
        )
        eventbridge.put_rule(
            Name='activate-round',
            ScheduleExpression='cron(0 14 ? * MON *)'
        )
    else:
        eventbridge.put_rule(
            Name='stats-to-sheet',
            ScheduleExpression='cron(30 23 ? * MON *)'
        )
        eventbridge.put_rule(
            Name='finalise-stats',
            ScheduleExpression='cron(0 23 ? * MON *)'
        )
        eventbridge.put_rule(
            Name='activate-round',
            ScheduleExpression='cron(0 0 ? * TUE *)'
        )
    
