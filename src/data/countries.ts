export interface State {
  name: string
  code: string
  cities: string[]
}

export interface Country {
  name: string
  code: string
  currency: string
  phone_code: string
  flag: string
  states: State[]
}

export const countries: Country[] = [
    {
        "name": "United States",
        "code": "USA",
        "currency": "USD",
        "phone_code": "+1",
        "flag": "🇺🇸.svg",
        "states": [
            {
                "name": "Alabama",
                "code": "AL",
                "cities": ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa", "Hoover", "Dothan", "Auburn", "Decatur", "Madison"]
            },
            {
                "name": "Alaska",
                "code": "AK",
                "cities": ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan", "Wasilla", "Kenai", "Kodiak", "Bethel", "Palmer"]
            },
            {
                "name": "Arizona",
                "code": "AZ",
                "cities": ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Glendale", "Gilbert", "Tempe", "Peoria", "Surprise"]
            },
            {
                "name": "Arkansas",
                "code": "AR",
                "cities": ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro", "North Little Rock", "Conway", "Rogers", "Pine Bluff", "Bentonville"]
            },
            {
                "name": "California",
                "code": "CA",
                "cities": ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim", "Santa Ana", "Riverside", "Stockton", "Irvine", "Chula Vista"]
            },
            {
                "name": "Colorado",
                "code": "CO",
                "cities": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton", "Arvada", "Westminster", "Pueblo", "Centennial"]
            },
            {
                "name": "Connecticut",
                "code": "CT",
                "cities": ["Bridgeport", "New Haven", "Stamford", "Hartford", "Waterbury", "Norwalk", "Danbury", "New Britain", "Bristol", "Meriden"]
            },
            {
                "name": "Delaware",
                "code": "DE",
                "cities": ["Wilmington", "Dover", "Newark", "Middletown", "Smyrna", "Milford", "Seaford", "Georgetown", "Elsmere", "New Castle"]
            },
            {
                "name": "District of Columbia",
                "code": "DC",
                "cities": ["Washington"]
            },
            {
                "name": "Florida",
                "code": "FL",
                "cities": ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Tallahassee", "Fort Lauderdale", "Port St. Lucie", "Cape Coral", "Pembroke Pines", "Hollywood", "Miramar", "Gainesville", "Coral Springs"]
            },
            {
                "name": "Georgia",
                "code": "GA",
                "cities": ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs", "Roswell", "Johns Creek", "Albany"]
            },
            {
                "name": "Hawaii",
                "code": "HI",
                "cities": ["Honolulu", "Pearl City", "Hilo", "Kailua", "Waipahu", "Kaneohe", "Mililani", "Kahului", "Ewa Beach", "Kapolei"]
            },
            {
                "name": "Idaho",
                "code": "ID",
                "cities": ["Boise", "Meridian", "Nampa", "Idaho Falls", "Pocatello", "Caldwell", "Coeur d'Alene", "Twin Falls", "Lewiston", "Post Falls"]
            },
            {
                "name": "Illinois",
                "code": "IL",
                "cities": ["Chicago", "Aurora", "Naperville", "Joliet", "Rockford", "Springfield", "Elgin", "Peoria", "Champaign", "Waukegan"]
            },
            {
                "name": "Indiana",
                "code": "IN",
                "cities": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Bloomington", "Fishers", "Hammond", "Gary", "Muncie"]
            },
            {
                "name": "Iowa",
                "code": "IA",
                "cities": ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City", "Waterloo", "Council Bluffs", "Ames", "West Des Moines", "Dubuque"]
            },
            {
                "name": "Kansas",
                "code": "KS",
                "cities": ["Wichita", "Overland Park", "Kansas City", "Olathe", "Topeka", "Lawrence", "Shawnee", "Manhattan", "Lenexa", "Salina"]
            },
            {
                "name": "Kentucky",
                "code": "KY",
                "cities": ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington", "Richmond", "Georgetown", "Florence", "Hopkinsville", "Nicholasville"]
            },
            {
                "name": "Louisiana",
                "code": "LA",
                "cities": ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles", "Kenner", "Bossier City", "Monroe", "Alexandria", "Houma"]
            },
            {
                "name": "Maine",
                "code": "ME",
                "cities": ["Portland", "Lewiston", "Bangor", "South Portland", "Auburn", "Biddeford", "Sanford", "Saco", "Augusta", "Westbrook"]
            },
            {
                "name": "Maryland",
                "code": "MD",
                "cities": ["Baltimore", "Columbia", "Germantown", "Silver Spring", "Waldorf", "Glen Burnie", "Ellicott City", "Frederick", "Rockville", "Gaithersburg"]
            },
            {
                "name": "Massachusetts",
                "code": "MA",
                "cities": ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "Brockton", "New Bedford", "Quincy", "Lynn", "Fall River"]
            },
            {
                "name": "Michigan",
                "code": "MI",
                "cities": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor", "Lansing", "Flint", "Dearborn", "Livonia", "Clinton Township"]
            },
            {
                "name": "Minnesota",
                "code": "MN",
                "cities": ["Minneapolis", "St. Paul", "Rochester", "Duluth", "Bloomington", "Brooklyn Park", "Plymouth", "St. Cloud", "Eagan", "Woodbury"]
            },
            {
                "name": "Mississippi",
                "code": "MS",
                "cities": ["Jackson", "Gulfport", "Southaven", "Hattiesburg", "Biloxi", "Meridian", "Tupelo", "Greenville", "Olive Branch", "Horn Lake"]
            },
            {
                "name": "Missouri",
                "code": "MO",
                "cities": ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence", "Lee's Summit", "O'Fallon", "St. Joseph", "St. Charles", "Blue Springs"]
            },
            {
                "name": "Montana",
                "code": "MT",
                "cities": ["Billings", "Missoula", "Great Falls", "Bozeman", "Butte", "Helena", "Kalispell", "Havre", "Anaconda", "Miles City"]
            },
            {
                "name": "Nebraska",
                "code": "NE",
                "cities": ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney", "Fremont", "Hastings", "Norfolk", "Columbus", "Papillion"]
            },
            {
                "name": "Nevada",
                "code": "NV",
                "cities": ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City", "Fernley", "Elko", "Mesquite", "Boulder City"]
            },
            {
                "name": "New Hampshire",
                "code": "NH",
                "cities": ["Manchester", "Nashua", "Concord", "Derry", "Rochester", "Salem", "Dover", "Merrimack", "Londonderry", "Hudson"]
            },
            {
                "name": "New Jersey",
                "code": "NJ",
                "cities": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Woodbridge", "Lakewood", "Toms River", "Hamilton", "Trenton"]
            },
            {
                "name": "New Mexico",
                "code": "NM",
                "cities": ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell", "Farmington", "Clovis", "Hobbs", "Alamogordo", "Carlsbad"]
            },
            {
                "name": "New York",
                "code": "NY",
                "cities": ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"]
            },
            {
                "name": "North Carolina",
                "code": "NC",
                "cities": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Concord"]
            },
            {
                "name": "North Dakota",
                "code": "ND",
                "cities": ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo", "Williston", "Dickinson", "Mandan", "Jamestown", "Wahpeton"]
            },
            {
                "name": "Ohio",
                "code": "OH",
                "cities": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain"]
            },
            {
                "name": "Oklahoma",
                "code": "OK",
                "cities": ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Lawton", "Edmond", "Moore", "Midwest City", "Enid", "Stillwater"]
            },
            {
                "name": "Oregon",
                "code": "OR",
                "cities": ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro", "Beaverton", "Bend", "Medford", "Springfield", "Corvallis"]
            },
            {
                "name": "Pennsylvania",
                "code": "PA",
                "cities": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "Altoona"]
            },
            {
                "name": "Rhode Island",
                "code": "RI",
                "cities": ["Providence", "Warwick", "Cranston", "Pawtucket", "East Providence", "Woonsocket", "Coventry", "Cumberland", "North Providence", "South Kingstown"]
            },
            {
                "name": "South Carolina",
                "code": "SC",
                "cities": ["Columbia", "Charleston", "North Charleston", "Mount Pleasant", "Rock Hill", "Greenville", "Summerville", "Sumter", "Goose Creek", "Hilton Head Island"]
            },
            {
                "name": "South Dakota",
                "code": "SD",
                "cities": ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown", "Mitchell", "Yankton", "Pierre", "Huron", "Vermillion"]
            },
            {
                "name": "Tennessee",
                "code": "TN",
                "cities": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin", "Jackson", "Johnson City", "Bartlett"]
            },
            {
                "name": "Texas",
                "code": "TX",
                "cities": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo", "Lubbock", "Garland", "Irving", "Amarillo", "Grand Prairie"]
            },
            {
                "name": "Utah",
                "code": "UT",
                "cities": ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "Sandy", "Ogden", "St. George", "Layton", "Taylorsville"]
            },
            {
                "name": "Vermont",
                "code": "VT",
                "cities": ["Burlington", "South Burlington", "Rutland", "Barre", "Montpelier", "Winooski", "St. Albans", "Newport", "Vergennes", "Brattleboro"]
            },
            {
                "name": "Virginia",
                "code": "VA",
                "cities": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News", "Alexandria", "Hampton", "Roanoke", "Portsmouth", "Suffolk"]
            },
            {
                "name": "Washington",
                "code": "WA",
                "cities": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent", "Everett", "Renton", "Yakima", "Federal Way"]
            },
            {
                "name": "West Virginia",
                "code": "WV",
                "cities": ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling", "Weirton", "Fairmont", "Martinsburg", "Beckley", "Clarksburg"]
            },
            {
                "name": "Wisconsin",
                "code": "WI",
                "cities": ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton", "Waukesha", "Eau Claire", "Oshkosh", "Janesville"]
            },
            {
                "name": "Wyoming",
                "code": "WY",
                "cities": ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs", "Sheridan", "Green River", "Evanston", "Riverton", "Jackson"]
            }
        ]
    },
    {
        "name": "Canada",
        "code": "CAN",
        "currency": "CAD",
        "phone_code": "+1",
        "flag": "🇨🇦.svg",
        "states": [
            {
                "name": "Alberta",
                "code": "AB",
                "cities": ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert", "Medicine Hat", "Grande Prairie", "Airdrie", "Spruce Grove", "Leduc"]
            },
            {
                "name": "British Columbia",
                "code": "BC",
                "cities": ["Vancouver", "Surrey", "Burnaby", "Richmond", "Abbotsford", "Coquitlam", "Kelowna", "Saanich", "Delta", "Kamloops"]
            },
            {
                "name": "Manitoba",
                "code": "MB",
                "cities": ["Winnipeg", "Brandon", "Steinbach", "Thompson", "Portage la Prairie", "Winkler", "Selkirk", "Morden", "Dauphin", "The Pas"]
            },
            {
                "name": "New Brunswick",
                "code": "NB",
                "cities": ["Moncton", "Saint John", "Fredericton", "Dieppe", "Miramichi", "Edmundston", "Bathurst", "Campbellton", "Riverview", "Quispamsis"]
            },
            {
                "name": "Newfoundland and Labrador",
                "code": "NL",
                "cities": ["St. John's", "Mount Pearl", "Corner Brook", "Conception Bay South", "Paradise", "Grand Falls-Windsor", "Gander", "Portugal Cove-St. Philip's", "Torbay", "Happy Valley-Goose Bay"]
            },
            {
                "name": "Northwest Territories",
                "code": "NT",
                "cities": ["Yellowknife", "Hay River", "Inuvik", "Fort Smith", "Behchokǫ̀", "Fort Simpson", "Norman Wells", "Tuktoyaktuk", "Fort Providence", "Aklavik"]
            },
            {
                "name": "Nova Scotia",
                "code": "NS",
                "cities": ["Halifax", "Cape Breton", "Truro", "New Glasgow", "Glace Bay", "Dartmouth", "Sydney", "Amherst", "Kentville", "Bridgewater"]
            },
            {
                "name": "Nunavut",
                "code": "NU",
                "cities": ["Iqaluit", "Rankin Inlet", "Arviat", "Baker Lake", "Cambridge Bay", "Pond Inlet", "Igloolik", "Kugluktuk", "Pangnirtung", "Cape Dorset"]
            },
            {
                "name": "Ontario",
                "code": "ON",
                "cities": ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Markham", "Vaughan", "Kitchener", "Windsor", "Richmond Hill", "Oakville", "Burlington", "Oshawa", "Barrie"]
            },
            {
                "name": "Prince Edward Island",
                "code": "PE",
                "cities": ["Charlottetown", "Summerside", "Stratford", "Cornwall", "Montague", "Kensington", "Souris", "Alberton", "O'Leary", "Georgetown"]
            },
            {
                "name": "Quebec",
                "code": "QC",
                "cities": ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke", "Saguenay", "Lévis", "Trois-Rivières", "Terrebonne", "Saint-Jean-sur-Richelieu", "Repentigny", "Brossard", "Drummondville", "Saint-Jérôme"]
            },
            {
                "name": "Saskatchewan",
                "code": "SK",
                "cities": ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw", "Swift Current", "Yorkton", "North Battleford", "Estevan", "Weyburn", "Martensville"]
            },
            {
                "name": "Yukon",
                "code": "YT",
                "cities": ["Whitehorse", "Dawson City", "Watson Lake", "Haines Junction", "Carmacks", "Mayo", "Faro", "Teslin", "Ross River", "Pelly Crossing"]
            }
        ]
    }
]
