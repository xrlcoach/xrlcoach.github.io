import time
from datetime import datetime
import os
import stat
from decimal import Decimal
from botocore.errorfactory import ClientError
from selenium import webdriver
import math
import gspread
from google.oauth2.service_account import Credentials
import csv

from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.expected_conditions import presence_of_element_located
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import NoSuchElementException
import sys

log = open('/home/james/Projects/XRL/functions/logs/stats_to_sheet.log', 'a')
sys.stdout = log
start = datetime.now()
print(f"Script executing at {start}")

forwards = ['Prop', '2nd Row', 'Lock', 'Interchange']
playmakers = ['Five-Eighth', 'Halfback', 'Hooker']
backs = ['Winger', 'Centre', 'Fullback']


def driver_setup():

    """Set up selenium driver and headless browser to interact with website"""

    options = Options()
    options.headless = True
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--single-process')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--log-level=3')
    options.binary_location = "/usr/bin/chromium-browser"

    return webdriver.Chrome(
        executable_path='/usr/bin/chromedriver', options=options
    )
    
def get_stats():

    with driver_setup() as driver:
        
        #draw_url = 'https://www.nrl.com/draw/'
        match_url_base = 'https://www.nrl.com/draw/nrl-premiership/2021/'
        draw_url = 'https://www.nrl.com/draw/?competition=111&season=2021&round=' + sys.argv[1]

        # Set timeout time
        wait = WebDriverWait(driver, 10)
        # retrive URL in headless browser
        print("Connecting to http://www.nrl.com/draw")
        driver.get(draw_url)

        # round_number = driver.find_element_by_class_name(
        # "filter-round__button filter-round__button--dropdown"
        # ).text
        round_number = driver.find_element_by_css_selector(
            "button[class='filter-round__button filter-round__button--dropdown']"
            ).text
        round_number = round_number.split()
        print(round_number)
        number = round_number[1]
        round_number = "-".join(round_number)

        stat_columns_final = ['Round', 'Team']

        player_stats_final = []

        # Scrape match titles located in hidden html fields
        draw_list = driver.find_elements_by_class_name("u-visually-hidden")
        matches = []
        for match in draw_list:
            if match.text[:6] == 'Match:':
                # Format match title into url
                fixture = match.text[7:].split(' vs ')
                fixture_formatted = []
                for team in fixture:
                    words = team.split()
                    team_name = "-".join(words)
                    fixture_formatted.append(team_name)
                fixture_formatted = "-v-".join(fixture_formatted)
                fixture_url = match_url_base + f'{round_number}/{fixture_formatted}'
                matches.append(fixture_url)
        
        match_count = 0

        for match in matches:
            
            match_count += 1

            # Change URL into match title and team names
            title = match[match.rfind('/') + 1:]
            title = title.replace('-', ' ')
            teams = title.split(' v ')
            home_team = teams[0]
            away_team = teams[1]

            print(f'\u001b[32mGetting player stats for {title}\u001b[0m')
            # Send browser to match url
            driver.get(match)

            # PUT SEND OFF SCRAPING HERE
            send_offs = {}
            divs = driver.find_elements_by_class_name('u-display-flex')
            for div in divs:
                try:
                    h4 = div.find_element_by_tag_name('h4')
                except NoSuchElementException:
                    continue
                if "sendOff" in h4.text:
                    ul = div.find_element_by_tag_name('ul')
                    lis = ul.find_elements_by_tag_name('li')
                    for li in lis:
                        print("Red card: " + li.text)
                        split = li.text.split()
                        name = ' '.join(split[:-1])
                        minute = split[-1][:-1]
                        send_offs[name] = minute

            # find player stats
            try:
                player_stats = driver.find_element_by_link_text("Player Stats")
            except NoSuchElementException:
                print(f"\u001b[31mCouldn't get player stats for {title}\u001b[0m")
                continue
            player_stats.send_keys(Keys.RETURN)

            wait.until(presence_of_element_located((By.ID, "tabs-match-centre-3")))
            # time.sleep(3)
            
            # Find head of table with column names and parse into stat_columns list
            if match_count == 1:
                head = driver.find_element_by_tag_name("thead")
                stats_row = head.find_elements_by_tag_name("th")
    
                stat_columns = []
                for col in stats_row:
                    stat_columns.append(col.text)
    
                stat_columns = [stat for stat in stat_columns if stat != '']
                stat_columns = stat_columns[10:]
                stat_columns_final += stat_columns
                #print(stat_columns_final)
                #print(len(stat_columns_final))

             # Scrape player stats into list
            home_file = []
            away_file = []

            home_stats = driver.find_elements_by_class_name('table-tbody__tr')  
            for player in home_stats:
                home_file.append(player.text)

            # Press button for away team
            try:
                driver.find_element_by_css_selector("button[class='button-group-item__button u-border u-t-bg-color-secondary-when-active u-t-border-color-secondary-when-active u-t-bg-color-tint-rm-on-hover u-t-border-color-tint-rm-on-hover']").click()
            except NoSuchElementException:
                print(f"\u001b[31mCouldn't get away stats for {title}\u001b[0m")

            # Scrape player stats for away team
            away_stats = driver.find_elements_by_class_name('table-tbody__tr') 
            for player in away_stats:
                away_file.append(player.text)

            home_stats = []
            home_players = []
            away_stats = []
            away_players = []

            # Go through list of rows and append stats (starting with digit) to stats
            # and player names to players, ignoring blank entries
            for row in home_file:
                if len(row) > 0:
                    if row[0].isdigit():
                        home_stats.append(row)
                    elif row[0].isalpha():
                        home_players.append(row)

            for row in away_file:
                if len(row) > 0:
                    if row[0].isdigit():
                        away_stats.append(row)
                    elif row[0].isalpha():
                        away_players.append(row)     

            # Create final lists for player stats, converting column info to correct type and format
            home_final = []
            away_final = []

            for i in range(len(home_players)):
                player = []
                player.append(number)
                player.append(home_team)
                player.append(home_players[i])
                ps = home_stats[i].split()
                for j in range(len(ps)):
                    if j == 1:
                        player.append(ps[j])
                    elif ':' in ps[j]:
                        player.append(int(ps[j][:2]))
                    elif '%' in ps[j]:
                        player.append(float(ps[j][:-1]) / 100)
                    elif '.' in ps[j]:
                        if ps[j][-1] == 's':
                            player.append(float(ps[j][:-1]))
                        else:
                            player.append(float(ps[j]))
                    elif ps[j] == '-':
                        player.append(0)
                    elif ps[j] == '2nd':
                        player.append('2nd Row')
                    elif ps[j] == 'Row':
                        continue
                    else:
                        try:
                            player.append(int(ps[j]))
                        except ValueError:
                            player.append(ps[j])
                
                home_final.append(player)

            for i in range(len(away_players)):
                player = []
                player.append(number)
                player.append(away_team)
                player.append(away_players[i])
                ps = away_stats[i].split()
                for j in range(len(ps)):
                    if j == 1:
                        player.append(ps[j])
                    elif ':' in ps[j]:
                        player.append(int(ps[j][:2]))
                    elif '%' in ps[j]:
                        player.append(float(ps[j][:-1]) / 100)
                    elif '.' in ps[j]:
                        if ps[j][-1] == 's':
                            player.append(float(ps[j][:-1]))
                        else:
                            player.append(float(ps[j]))
                    elif ps[j] == '-':
                        player.append(0)
                    elif ps[j] == '2nd':
                        player.append('2nd Row')
                    elif ps[j] == 'Row':
                        continue
                    else:
                        try:
                            player.append(int(ps[j]))
                        except ValueError:
                            player.append(ps[j])
                
                away_final.append(player)

            player_stats_final += home_final + away_final
            print(home_final[0])            

        # Write player stats to round csv file
        print(f'\u001b[32mWriting stats to {round_number}.csv\u001b[0m')
        with open(f'/home/james/Projects/XRL/stats/2021/{round_number}.csv', 'w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(stat_columns_final)
            writer.writerows(player_stats_final)
    
    # Define variables for connecting to google drive
    print('\u001b[32mOpening google sheet\u001b[0m')
    scope = ["https://spreadsheets.google.com/feeds", 'https://www.googleapis.com/auth/spreadsheets',
            "https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]

    credentials = Credentials.from_service_account_file('/home/james/Projects/XRL/functions/XRL_test.json', scopes=scope)
    client = gspread.authorize(credentials)

    # Open sheet for round
    spreadsheet = client.open('Stats2021')
    spreadsheet.add_worksheet(round_number, 400, 100)
    csvFile = f'/home/james/Projects/XRL/stats/2021/{round_number}.csv'

    spreadsheet.values_update(
        round_number,
        params={'valueInputOption': 'USER_ENTERED'},
        body={'values': list(csv.reader(open(csvFile)))}
    )

    finish = datetime.now()
    print(f"Execution took {finish - start}")       
            

if __name__ == '__main__':
    get_stats()