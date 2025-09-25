// Expanded prediction markets for tech, celebrity, and sports categories
// Following the established format and OnchainKit integration patterns

export interface MarketTemplate {
  question: string;
  category: 'tech' | 'celebrity' | 'sports';
  endTime: string; // ISO format
  description: string;
  tags: string[];
}

// TECH MARKETS (25 markets)
export const techMarkets: MarketTemplate[] = [
  // Stock Prices & Valuations
  {
    question: "Will Apple stock reach $250 by December 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "Apple's continued innovation in AI and AR could drive significant stock price appreciation.",
    tags: ["#apple", "#stock", "#250target"]
  },
  {
    question: "Will NVIDIA stock reach $200 by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "AI chip demand continues driving NVIDIA's valuation higher amid competition.",
    tags: ["#nvidia", "#ai", "#stock"]
  },
  {
    question: "Will Microsoft reach $5T market cap by 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "Azure cloud growth and AI integration could push Microsoft to historic valuation.",
    tags: ["#microsoft", "#marketcap", "#5trillion"]
  },
  {
    question: "Will Tesla stock reach $400 by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "Full Self-Driving breakthroughs and Cybertruck production could boost Tesla's value.",
    tags: ["#tesla", "#stock", "#fsd"]
  },
  {
    question: "Will Amazon stock reach $200 by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "AWS growth and AI services expansion drive Amazon's enterprise value.",
    tags: ["#amazon", "#aws", "#stock"]
  },

  // Product Launches & Releases
  {
    question: "Will Apple release AR glasses by December 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "Apple's AR/VR ambitions continue with rumored lightweight AR glasses for consumers.",
    tags: ["#apple", "#ar", "#glasses"]
  },
  {
    question: "Will Google release Pixel Watch 3 by October 2024?",
    category: "tech",
    endTime: "2024-10-31T23:59:59Z",
    description: "Google's wearable strategy continues with next-generation Pixel Watch features.",
    tags: ["#google", "#pixelwatch", "#wearables"]
  },
  {
    question: "Will Meta release Quest 4 VR headset by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "Meta's continued investment in VR technology and metaverse development.",
    tags: ["#meta", "#quest4", "#vr"]
  },
  {
    question: "Will Samsung release foldable laptop by 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "Samsung's foldable display technology expanding into laptop form factors.",
    tags: ["#samsung", "#foldable", "#laptop"]
  },
  {
    question: "Will OpenAI release GPT-5 by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "The next generation of large language models with enhanced capabilities.",
    tags: ["#openai", "#gpt5", "#ai"]
  },

  // IPOs & Acquisitions
  {
    question: "Will OpenAI IPO at $100B+ valuation in 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "The AI leader considers going public amid massive growth and investor interest.",
    tags: ["#openai", "#ipo", "#100billion"]
  },
  {
    question: "Will Starlink IPO by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "SpaceX's satellite internet constellation considers separate public offering.",
    tags: ["#starlink", "#ipo", "#spacex"]
  },
  {
    question: "Will Discord IPO by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "The gaming communication platform evaluates public market opportunities.",
    tags: ["#discord", "#ipo", "#gaming"]
  },
  {
    question: "Will Databricks IPO at $50B+ valuation by 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "The data lakehouse company prepares for public markets amid AI boom.",
    tags: ["#databricks", "#ipo", "#data"]
  },
  {
    question: "Will Microsoft acquire a major gaming studio by 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "Following Activision Blizzard, Microsoft continues gaming expansion strategy.",
    tags: ["#microsoft", "#gaming", "#acquisition"]
  },

  // AI & Breakthrough Technologies
  {
    question: "Will AI achieve AGI breakthrough by end of 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "Artificial General Intelligence milestone could revolutionize technology landscape.",
    tags: ["#agi", "#ai", "#breakthrough"]
  },
  {
    question: "Will quantum computer solve major real-world problem by 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "Quantum computing advances target practical applications in optimization and cryptography.",
    tags: ["#quantum", "#breakthrough", "#computing"]
  },
  {
    question: "Will self-driving cars achieve Level 5 autonomy by 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "Full autonomous driving without human intervention becomes commercially available.",
    tags: ["#autonomous", "#level5", "#selfdriving"]
  },
  {
    question: "Will brain-computer interface reach consumer market by 2026?",
    category: "tech",
    endTime: "2026-12-31T23:59:59Z",
    description: "Neuralink and competitors push BCI technology toward mainstream adoption.",
    tags: ["#bci", "#neuralink", "#consumer"]
  },
  {
    question: "Will fusion energy achieve net positive output by 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "Clean fusion energy breakthrough could transform global energy landscape.",
    tags: ["#fusion", "#energy", "#breakthrough"]
  },

  // Platform & Service Milestones
  {
    question: "Will ChatGPT reach 1 billion monthly users by 2025?",
    category: "tech",
    endTime: "2025-12-31T23:59:59Z",
    description: "OpenAI's flagship AI model continues rapid global user adoption.",
    tags: ["#chatgpt", "#1billion", "#users"]
  },
  {
    question: "Will TikTok be banned in 5+ countries by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "National security concerns drive potential widespread TikTok restrictions.",
    tags: ["#tiktok", "#ban", "#security"]
  },
  {
    question: "Will Twitter/X reach 1 billion users by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "Under Elon Musk's leadership, X aims for massive user growth expansion.",
    tags: ["#twitter", "#x", "#1billion"]
  },
  {
    question: "Will AWS reach $100B annual revenue by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "Amazon's cloud platform continues dominating enterprise infrastructure market.",
    tags: ["#aws", "#100billion", "#revenue"]
  },
  {
    question: "Will Shopify reach $10B annual revenue by end of 2024?",
    category: "tech",
    endTime: "2024-12-31T23:59:59Z",
    description: "E-commerce platform benefits from continued online retail growth.",
    tags: ["#shopify", "#10billion", "#ecommerce"]
  }
];

// CELEBRITY MARKETS (25 markets)
export const celebrityMarkets: MarketTemplate[] = [
  // Relationships & Personal Life
  {
    question: "Will Taylor Swift announce engagement by December 2024?",
    category: "celebrity",
    endTime: "2024-12-31T23:59:59Z",
    description: "The pop superstar's relationship with Travis Kelce continues making headlines worldwide.",
    tags: ["#taylorswift", "#engagement", "#traviskelce"]
  },
  {
    question: "Will Kim Kardashian get married again by end of 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "The reality star and business mogul's high-profile relationships continue evolving.",
    tags: ["#kimkardashian", "#marriage", "#relationship"]
  },
  {
    question: "Will Ariana Grande announce pregnancy by end of 2024?",
    category: "celebrity",
    endTime: "2024-12-31T23:59:59Z",
    description: "The pop star's personal life remains in constant media spotlight.",
    tags: ["#arianagrande", "#pregnancy", "#baby"]
  },
  {
    question: "Will Rihanna have another baby by end of 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "The music icon continues expanding her family while building business empire.",
    tags: ["#rihanna", "#baby", "#family"]
  },
  {
    question: "Will Jennifer Lopez get married again by 2026?",
    category: "celebrity",
    endTime: "2026-12-31T23:59:59Z",
    description: "The multi-talented star's romantic life continues capturing public attention.",
    tags: ["#jenniferlopez", "#marriage", "#romance"]
  },

  // Career Moves & Business Ventures
  {
    question: "Will Elon Musk step down as Tesla CEO by end of 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "The tech mogul faces scrutiny over multiple company commitments and leadership.",
    tags: ["#elonmusk", "#tesla", "#ceo"]
  },
  {
    question: "Will Oprah Winfrey acquire major media company by 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "The media mogul continues expanding influence across entertainment and publishing.",
    tags: ["#oprah", "#media", "#acquisition"]
  },
  {
    question: "Will Ryan Reynolds buy another sports team by 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "Following Wrexham FC success, the actor-entrepreneur eyes additional sports investments.",
    tags: ["#ryanreynolds", "#sports", "#investment"]
  },
  {
    question: "Will Kim Kardashian launch crypto token by end of 2024?",
    category: "celebrity",
    endTime: "2024-12-31T23:59:59Z",
    description: "The business mogul explores Web3 opportunities for her expanding brand empire.",
    tags: ["#kimkardashian", "#crypto", "#token"]
  },
  {
    question: "Will Rihanna launch fashion house by end of 2024?",
    category: "celebrity",
    endTime: "2024-12-31T23:59:59Z",
    description: "The music icon's Fenty brand success suggests potential high-fashion expansion.",
    tags: ["#rihanna", "#fashion", "#fenty"]
  },

  // Awards & Recognition
  {
    question: "Will Ariana Grande win Oscar by end of 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "Her transition to serious acting roles positions her for potential Academy recognition.",
    tags: ["#arianagrande", "#oscar", "#acting"]
  },
  {
    question: "Will Taylor Swift win another Grammy Album of the Year?",
    category: "celebrity",
    endTime: "2025-02-28T23:59:59Z",
    description: "The pop superstar's continued musical evolution and critical acclaim.",
    tags: ["#taylorswift", "#grammy", "#album"]
  },
  {
    question: "Will Zendaya win Emmy for dramatic acting by 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "The young star's dramatic performances continue earning critical recognition.",
    tags: ["#zendaya", "#emmy", "#drama"]
  },
  {
    question: "Will Lady Gaga win Oscar for acting by 2026?",
    category: "celebrity",
    endTime: "2026-12-31T23:59:59Z",
    description: "Following 'A Star is Born,' she continues pursuing serious acting recognition.",
    tags: ["#ladygaga", "#oscar", "#acting"]
  },
  {
    question: "Will Justin Bieber win Grammy for Album of the Year by 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "The pop star's musical maturation seeks recognition at highest levels.",
    tags: ["#justinbieber", "#grammy", "#album"]
  },

  // Political & Social Ambitions
  {
    question: "Will The Rock run for President in 2028?",
    category: "celebrity",
    endTime: "2028-01-01T00:00:00Z",
    description: "Dwayne Johnson has hinted at political ambitions and maintains broad appeal.",
    tags: ["#therock", "#president", "#politics"]
  },
  {
    question: "Will Mark Cuban run for political office by 2026?",
    category: "celebrity",
    endTime: "2026-12-31T23:59:59Z",
    description: "The billionaire entrepreneur has expressed interest in public service.",
    tags: ["#markcuban", "#politics", "#office"]
  },
  {
    question: "Will Kanye West run for President again in 2028?",
    category: "celebrity",
    endTime: "2028-01-01T00:00:00Z",
    description: "The controversial artist's continued political ambitions and public statements.",
    tags: ["#kanyewest", "#president", "#2028"]
  },
  {
    question: "Will Oprah Winfrey endorse Presidential candidate in 2024?",
    category: "celebrity",
    endTime: "2024-11-05T23:59:59Z",
    description: "The media mogul's political endorsements carry significant influence.",
    tags: ["#oprah", "#endorsement", "#president"]
  },
  {
    question: "Will Leonardo DiCaprio start climate change political movement by 2025?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "The environmental activist continues leveraging fame for climate action.",
    tags: ["#leonardo", "#climate", "#movement"]
  },

  // Entertainment & Creative Projects
  {
    question: "Will Jennifer Lawrence return to Hunger Games franchise?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "The franchise's continued success sparks speculation about Katniss's return.",
    tags: ["#jenniferlawrence", "#hungergames", "#return"]
  },
  {
    question: "Will Robert Downey Jr. return to Marvel as Iron Man?",
    category: "celebrity",
    endTime: "2025-12-31T23:59:59Z",
    description: "Iron Man's potential return continues fueling MCU speculation and fan theories.",
    tags: ["#robertdowneyjr", "#marvel", "#ironman"]
  },
  {
    question: "Will Tom Cruise film movie in actual space by 2026?",
    category: "celebrity",
    endTime: "2026-12-31T23:59:59Z",
    description: "The action star's commitment to practical stunts reaches astronomical heights.",
    tags: ["#tomcruise", "#space", "#movie"]
  },
  {
    question: "Will Beyoncé release country album by end of 2024?",
    category: "celebrity",
    endTime: "2024-12-31T23:59:59Z",
    description: "Queen B's recent country singles suggest potential full genre exploration.",
    tags: ["#beyonce", "#country", "#album"]
  },
  {
    question: "Will Dolly Parton write Broadway musical by end of 2024?",
    category: "celebrity",
    endTime: "2024-12-31T23:59:59Z",
    description: "The country legend's storytelling talents seem perfect for Broadway adaptation.",
    tags: ["#dollyparton", "#broadway", "#musical"]
  },

  // Comebacks & Returns
  {
    question: "Will Britney Spears make music comeback by end of 2024?",
    category: "celebrity",
    endTime: "2024-12-31T23:59:59Z",
    description: "The pop icon's potential return following personal and legal battles.",
    tags: ["#britneyspears", "#comeback", "#music"]
  }
];

// SPORTS MARKETS (25 markets)
export const sportsMarkets: MarketTemplate[] = [
  // Championship Predictions
  {
    question: "Will Kansas City Chiefs win Super Bowl 2025?",
    category: "sports",
    endTime: "2025-02-15T00:00:00Z",
    description: "KC aims for unprecedented three-peat championship in NFL history.",
    tags: ["#chiefs", "#superbowl", "#threepeat"]
  },
  {
    question: "Will Boston Celtics win NBA Championship 2025?",
    category: "sports",
    endTime: "2025-06-30T23:59:59Z",
    description: "The defending champions aim to repeat with their core roster intact.",
    tags: ["#celtics", "#nba", "#championship"]
  },
  {
    question: "Will Manchester City win Champions League 2025?",
    category: "sports",
    endTime: "2025-05-31T23:59:59Z",
    description: "Pep Guardiola's team continues pursuing European glory with elite squad.",
    tags: ["#mancity", "#championsleague", "#pep"]
  },
  {
    question: "Will Tampa Bay Lightning win Stanley Cup 2025?",
    category: "sports",
    endTime: "2025-06-30T23:59:59Z",
    description: "The Lightning's championship experience positions them for another Cup run.",
    tags: ["#lightning", "#stanleycup", "#hockey"]
  },
  {
    question: "Will Los Angeles Dodgers win World Series 2024?",
    category: "sports",
    endTime: "2024-11-30T23:59:59Z",
    description: "The Dodgers' massive payroll and star talent target championship glory.",
    tags: ["#dodgers", "#worldseries", "#baseball"]
  },

  // Individual Achievement Records
  {
    question: "Will Lionel Messi win another Ballon d'Or by 2025?",
    category: "sports",
    endTime: "2025-12-31T23:59:59Z",
    description: "The Argentine maestro continues performing at highest level in MLS.",
    tags: ["#messi", "#ballondor", "#mls"]
  },
  {
    question: "Will LeBron James play until age 45?",
    category: "sports",
    endTime: "2029-12-30T23:59:59Z",
    description: "The NBA legend continues defying age expectations with elite performance.",
    tags: ["#lebronjames", "#nba", "#longevity"]
  },
  {
    question: "Will Tiger Woods win another major championship by 2026?",
    category: "sports",
    endTime: "2026-12-31T23:59:59Z",
    description: "The golf legend's comeback journey continues despite physical challenges.",
    tags: ["#tigerwoods", "#golf", "#major"]
  },
  {
    question: "Will Cristiano Ronaldo play in 2026 World Cup?",
    category: "sports",
    endTime: "2026-07-31T23:59:59Z",
    description: "The Portuguese legend defies age expectations with international ambitions.",
    tags: ["#ronaldo", "#worldcup", "#portugal"]
  },
  {
    question: "Will Serena Williams return to professional tennis by 2025?",
    category: "sports",
    endTime: "2025-12-31T23:59:59Z",
    description: "The tennis legend's competitive spirit might draw her back to court.",
    tags: ["#serena", "#tennis", "#comeback"]
  },

  // Performance Milestones
  {
    question: "Will Shohei Ohtani hit 60 home runs in 2024?",
    category: "sports",
    endTime: "2024-09-30T23:59:59Z",
    description: "The two-way superstar's offensive prowess could reach historic levels.",
    tags: ["#ohtani", "#baseball", "#60homeruns"]
  },
  {
    question: "Will Steph Curry make 500 three-pointers in 2024-25 season?",
    category: "sports",
    endTime: "2025-04-30T23:59:59Z",
    description: "The Warriors star continues redefining basketball's long-range possibilities.",
    tags: ["#stephcurry", "#3pointers", "#500"]
  },
  {
    question: "Will Connor McDavid reach 150 points in 2024-25 season?",
    category: "sports",
    endTime: "2025-04-30T23:59:59Z",
    description: "The Oilers captain chases hockey's most exclusive scoring milestone.",
    tags: ["#mcdavid", "#hockey", "#150points"]
  },
  {
    question: "Will Max Verstappen win 4th consecutive F1 championship?",
    category: "sports",
    endTime: "2024-11-30T23:59:59Z",
    description: "The Dutch driver continues dominance in Formula 1 racing.",
    tags: ["#verstappen", "#f1", "#4thchampionship"]
  },
  {
    question: "Will Caitlin Clark win WNBA MVP in rookie year?",
    category: "sports",
    endTime: "2024-10-31T23:59:59Z",
    description: "The rookie sensation's impact on women's basketball continues growing.",
    tags: ["#caitlinclark", "#wnba", "#mvp"]
  },

  // Team & League Milestones
  {
    question: "Will LeBron and Bronny James play together in NBA?",
    category: "sports",
    endTime: "2024-12-31T23:59:59Z",
    description: "The father-son duo could make basketball history on same team.",
    tags: ["#lebron", "#bronny", "#fatherson"]
  },
  {
    question: "Will USA win most medals at 2024 Paris Olympics?",
    category: "sports",
    endTime: "2024-08-11T23:59:59Z",
    description: "Team USA aims to top the medal count at Paris Olympics.",
    tags: ["#teamusa", "#olympics", "#medals"]
  },
  {
    question: "Will Kylian Mbappé win Champions League with Real Madrid?",
    category: "sports",
    endTime: "2025-05-31T23:59:59Z",
    description: "The French superstar's move to Madrid targets European glory.",
    tags: ["#mbappe", "#realmadrid", "#championsleague"]
  },
  {
    question: "Will Novak Djokovic win Olympic gold medal at Paris 2024?",
    category: "sports",
    endTime: "2024-08-11T23:59:59Z",
    description: "The tennis great seeks the one major title that has eluded his career.",
    tags: ["#djokovic", "#olympics", "#gold"]
  },
  {
    question: "Will Argentina win Copa América 2024?",
    category: "sports",
    endTime: "2024-07-14T23:59:59Z",
    description: "The World Cup champions aim to continue their international dominance.",
    tags: ["#argentina", "#copaamerica", "#messi"]
  },

  // Transfers & Moves
  {
    question: "Will Harry Kane score 30+ goals in first Bundesliga season?",
    category: "sports",
    endTime: "2024-05-31T23:59:59Z",
    description: "The English striker adapts to German football with Bayern Munich.",
    tags: ["#harrykane", "#bundesliga", "#30goals"]
  },
  {
    question: "Will Lionel Messi extend Inter Miami contract beyond 2025?",
    category: "sports",
    endTime: "2025-12-31T23:59:59Z",
    description: "The soccer legend's MLS journey and long-term commitment to American soccer.",
    tags: ["#messi", "#intermiami", "#extension"]
  },
  {
    question: "Will Neymar return to European football by 2025?",
    category: "sports",
    endTime: "2025-12-31T23:59:59Z",
    description: "The Brazilian star's potential return from Saudi Arabia to top leagues.",
    tags: ["#neymar", "#europe", "#return"]
  },
  {
    question: "Will Kevin Durant win another NBA championship by 2026?",
    category: "sports",
    endTime: "2026-06-30T23:59:59Z",
    description: "The veteran superstar continues chasing additional championship rings.",
    tags: ["#kevindurant", "#nba", "#championship"]
  },
  {
    question: "Will Erling Haaland score 40+ Premier League goals in 2024-25?",
    category: "sports",
    endTime: "2025-05-31T23:59:59Z",
    description: "The Norwegian striker continues breaking scoring records in England.",
    tags: ["#haaland", "#premierleague", "#40goals"]
  }
];

// Combined export for easy access
export const expandedMarkets = {
  tech: techMarkets,
  celebrity: celebrityMarkets,
  sports: sportsMarkets,
  all: [...techMarkets, ...celebrityMarkets, ...sportsMarkets]
};

// Utility functions for market creation
export function generateMarketCreationData(market: MarketTemplate) {
  return {
    question: market.question,
    category: market.category,
    endTime: new Date(market.endTime),
    description: market.description,
    tags: market.tags
  };
}

export function getMarketsByCategory(category: 'tech' | 'celebrity' | 'sports') {
  return expandedMarkets[category];
}

export function getRandomMarketsFromCategory(category: 'tech' | 'celebrity' | 'sports', count: number) {
  const markets = expandedMarkets[category];
  const shuffled = [...markets].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}