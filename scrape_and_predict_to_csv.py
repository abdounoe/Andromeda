import csv
from bs4 import BeautifulSoup
import requests
import time
import numpy as np


def clean_scrape_data(data):

    temp=[]
    for i in range(len(data)) :
        if data[i]!='' and "№" not in data[i] and "+" not in data[i] :
            temp.append(data[i])


    return temp

def score_format_correction(score):
    total_lenght_score=0
    for i in range(1,len(score)):
      if score[-i].isdigit():
        total_lenght_score+=1

    new_score=["0,0"]

    middle=total_lenght_score//2

    if total_lenght_score//2 >= 2 :
        new_score=score[:-total_lenght_score]+score[ -total_lenght_score+1 :-middle]+[ score[-total_lenght_score]] + score[-middle+1:]+[score[-middle]]
        
    return new_score


def merge_score_and_time(data):
    temp=[]
    # print(len(data))

    for i in range(0,len(data)-1,2):
        print(data[i])


        if len(data)>1 and len(data[i+1])>0 and ( "Set" in data[i+1][0]) :
            # print(data[i])
            # print(data[i+1])
            temp.append( data[i+1] + score_format_correction(data[i]) )

            # print(data[i+1][0])

    # print("Merged sore and time",np.shape(temp))

    return temp


def parse_match_data(match_data):
    matches = []
    for data in match_data:
        match_info = data
        if len(match_info) > 5 :
            match = {}
            match['Sets'] = match_info[0]
            match['Match'] = match_info[1] + " vs " + match_info[2] if len(match_info) > 3 else "0"

            total_lenght_score=0
            for i in range(1,len(match_info)):
                if match_info[-i].isdigit():
                    total_lenght_score+=1

            # print(match_info)

            j=1 if match_info[3].isdigit() else 0

            match['1Set'] = match_info[4-j] + "," + match_info[4+total_lenght_score//2-j] if total_lenght_score//2 >= 2 else "0,0"
            match['2Set'] = match_info[5-j] + "," + match_info[5+total_lenght_score//2-j] if total_lenght_score//2 >= 3 else "0,0"
            match['3Set'] = match_info[6-j] + "," + match_info[6+total_lenght_score//2-j] if total_lenght_score//2 >= 4 else "0,0"
            match['4Set'] = match_info[7-j] + "," + match_info[7+total_lenght_score//2-j] if total_lenght_score//2 >= 5 else "0,0"
            match['5Set'] = match_info[8-j] + "," + match_info[8+total_lenght_score//2-j] if total_lenght_score//2 >= 6 else "0,0"
            match['6Set'] = match_info[9-j] + "," + match_info[9+total_lenght_score//2-j] if total_lenght_score//2 >= 7 else "0,0"
            match['7Set'] = match_info[10-j] + "," + match_info[10+total_lenght_score//2-j] if total_lenght_score//2 >= 8 else "0,0"



            match['Total points'] = match_info[ -total_lenght_score//2-1 ] + "," + match_info[-1]


            matches.append(match)


    return matches






def scrape_elements(url):
    response = requests.get( url, headers={"Accept-Language": "fr-FR,en;q=0.5"} )
    soup = BeautifulSoup(response.text, 'html.parser')
    elements = soup.select(".dashboard-champ-content")

    data = [element.text.replace(" ", "").split("\n") for element in elements]

    for i in range(len(data)):
        data[i]= clean_scrape_data(data[i])

    print("Scraped data")
    # print(data)

    data=merge_score_and_time(data)


    # Have to return a dict with the following keys:
    # Match, Duration, 1Quart-temps, 2Quart-temps, 3Quart-temps, 4Quart-temps, Total points

    # new_data=data
    new_data=parse_match_data(data)

    return new_data


def write_data_to_csv(data):
    fieldnames = ['Sets','Match' , '1Set', '2Set', '3Set', '4Set', '5Set', '6Set', '7Set', 'Total points']
    with open('output_ping_pong.csv', 'w', newline='') as csvfile:
        csvwriter = csv.DictWriter(csvfile, fieldnames=fieldnames)
        csvwriter.writeheader()
        for match in data:
            csvwriter.writerow(match)


urls = ["https://1xbet.com/live/table-tennis/2222157-ctt-21-world-championship","https://1xbet.com/fr/live/table-tennis/2064427-masters","https://1xbet.com/fr/live/table-tennis/2071520-masters-women","https://1xbet.com/fr/live/table-tennis/2031986-art-cup","https://1xbet.com/fr/live/table-tennis/2075339-pro-spin-series","https://1xbet.com/fr/live/table-tennis/2081296-pro-spin-series-women","https://1xbet.com/fr/live/table-tennis/2365607-tt-cup-czech-republic","https://1xbet.com/fr/live/table-tennis/455-ligue-pro","https://1xbet.com/fr/live/table-tennis/1733171-setka-cup","https://1xbet.com/fr/live/table-tennis/461-championnat-darmnie-itt-cup","https://1xbet.com/fr/live/table-tennis/1792858-win-cup"]




def append_file_every_seconds(delay):
    while True:

        for url in urls :
            data = scrape_elements(url)
            write_data_to_csv(data)

        time.sleep(delay)


for url in urls :
    data = scrape_elements(url)
    print(data)

# write_data_to_csv(data)


# append_file_every_seconds(30)