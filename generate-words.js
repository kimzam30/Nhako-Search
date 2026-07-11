const fs = require('fs');
const path = require('path');

const wordsDir = path.join(__dirname, 'lib', 'words');
if (!fs.existsSync(wordsDir)) {
  fs.mkdirSync(wordsDir, { recursive: true });
}

const pools = {
  'garden': ['FLOWER', 'SEED', 'SOIL', 'SUN', 'ROOT', 'LEAF', 'PETAL', 'WATER', 'BLOOM', 'TREE', 'BUSH', 'VINE', 'BLOSSOM', 'GARDEN', 'SPROUT', 'BRANCH', 'TRUNK', 'STEM', 'WEED', 'FERN', 'DAISY', 'ROSE', 'LILY', 'MOSS', 'HERB', 'DIRT', 'RAKE', 'HOE', 'POT', 'BUG', 'WORM', 'BEE', 'ANT', 'GRASS', 'LAWN', 'PATH', 'GATE', 'FENCE', 'SHED', 'HOSE', 'BUD', 'SHRUB', 'MULCH', 'SPADE', 'TROWEL', 'PEAT', 'LOAM', 'CLAY', 'COMPOST', 'PRUNE', 'MOW'],
  'rainy-day': ['CLOUD', 'STORM', 'DROP', 'PUDDLE', 'SPLASH', 'UMBRELLA', 'BOOTS', 'COAT', 'THUNDER', 'LIGHTNING', 'WIND', 'MIST', 'FOG', 'DAMP', 'WET', 'SOAK', 'DRIZZLE', 'POUR', 'GUST', 'BREEZE', 'CHILL', 'GLOOM', 'GREY', 'DARK', 'OVERCAST', 'MUD', 'MUDDY', 'HAIL', 'SLEET', 'SNOW', 'COLD', 'RAIN', 'RAINY', 'DRENCH', 'WASH', 'FLOOD', 'DRAIN', 'GUTTER', 'ROOF', 'INDOORS', 'COZY', 'WARM', 'TEA', 'BOOK', 'READ', 'SLEEP', 'NAP', 'REST'],
  'cozy-cottage': ['WOOD', 'FIRE', 'HEARTH', 'RUG', 'SOFA', 'CHAIR', 'MUG', 'BLANKET', 'QUILT', 'PILLOW', 'BED', 'SLEEP', 'REST', 'WARM', 'COZY', 'CABIN', 'RUSTIC', 'PINE', 'LOG', 'FLAME', 'STOVE', 'BAKE', 'BREAD', 'SOUP', 'STEW', 'KNIT', 'YARN', 'WOOL', 'SOCKS', 'TEA', 'COCOA', 'CIDER', 'BOOK', 'NOVEL', 'READ', 'LAMP', 'GLOW', 'LIGHT', 'CANDLE', 'WICK', 'MATCH', 'SMOKE', 'ASH', 'CHIMNEY', 'BRICK', 'STONE', 'PATH', 'DOOR', 'WOODS', 'HOME'],
  'night-sky': ['STAR', 'MOON', 'PLANET', 'COMET', 'METEOR', 'SPACE', 'GALAXY', 'ORBIT', 'DUST', 'DARK', 'BLACK', 'VOID', 'NIGHT', 'SKY', 'CLOUD', 'ASTEROID', 'ROCKET', 'SHIP', 'ALIEN', 'UFO', 'MARS', 'VENUS', 'SATURN', 'RING', 'TELESCOPE', 'LENS', 'VIEW', 'SIGHT', 'SHINE', 'GLOW', 'BRIGHT', 'LIGHT', 'TWINKLE', 'SPARKLE', 'SHIMMER', 'GLIMMER', 'BEAM', 'RAY', 'SOLAR', 'LUNAR', 'ECLIPSE', 'PHASE', 'WAX', 'WANE', 'FULL', 'HALF', 'CRESCENT', 'NEW', 'CLEAR'],
  'date-night': ['LOVE', 'HEART', 'ROSE', 'WINE', 'DINE', 'FOOD', 'MEAL', 'TABLE', 'CHAIR', 'CANDLE', 'LIGHT', 'MUSIC', 'DANCE', 'SONG', 'TUNE', 'BEAT', 'RHYTHM', 'STEP', 'MOVE', 'HOLD', 'HUG', 'KISS', 'LIPS', 'SMILE', 'LAUGH', 'JOKE', 'TALK', 'CHAT', 'WORD', 'VOICE', 'SWEET', 'CUTE', 'PRETTY', 'HANDSOME', 'BEAUTY', 'CHARM', 'GRACE', 'STYLE', 'DRESS', 'SUIT', 'TIE', 'SHOE', 'WALK', 'STROLL', 'PARK', 'NIGHT', 'LATE', 'MOON', 'STAR', 'DATE'],
  'standard': ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MELON', 'BERRY', 'PEAR', 'PEACH', 'PLUM', 'KIWI', 'MANGO', 'LEMON', 'LIME', 'CAT', 'DOG', 'BIRD', 'FISH', 'MOUSE', 'RAT', 'HORSE', 'COW', 'PIG', 'SHEEP', 'GOAT', 'DUCK', 'HEN', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'BLACK', 'WHITE', 'GRAY', 'BROWN', 'PINK', 'PURPLE', 'ORANGE', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'HOUSE', 'CAR', 'BOAT', 'TRAIN', 'PLANE']
};

for (const [theme, words] of Object.entries(pools)) {
  const categorized = {
    easy: words.filter(w => w.length >= 3 && w.length <= 5),
    medium: words.filter(w => w.length >= 4 && w.length <= 7),
    hard: words.filter(w => w.length >= 5 && w.length <= 9)
  };
  fs.writeFileSync(path.join(wordsDir, `${theme}.json`), JSON.stringify(categorized, null, 2));
}
console.log('Words created successfully.');
