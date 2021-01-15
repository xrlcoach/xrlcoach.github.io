import time
import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr
import os
import stat
from decimal import Decimal
from botocore.errorfactory import ClientError
from selenium import webdriver

from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.expected_conditions import presence_of_element_located
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import NoSuchElementException
import sys



def driver_setup():

    """Set up selenium driver and headless browser to interact with website"""
    
    #chrome_driver_path = '/usr/bin/chromedriver'
    
    
    #os.chmod('/opt/chromedriver', st.st_mode | stat.S_IEXEC)

    options = Options()
    options.headless = True
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--single-process')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--log-level=3')
    options.binary_location = "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"

    return webdriver.Chrome(
        executable_path='../../chromedriver.exe', options=options
    )
    
send_offs = {}

with driver_setup() as driver:
    
    url = 'https://www.nrl.com/draw/nrl-premiership/2020/round-8/sea-eagles-v-knights/'

    # Set timeout time
    wait = WebDriverWait(driver, 10)
    # retrive URL in headless browser
    print("Connecting to https://www.nrl.com/draw/nrl-premiership/2020/round-8/sea-eagles-v-knights/")
    driver.get(url)
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
                print(li.text)
                split = li.text.split()
                name = ' '.join(split[:-1])
                print(name)
                minute = split[-1][:-1]
                print(minute)
                send_offs[name] = minute
                print(send_offs)