import json
import re

def strip_tajweed(text):
    # Remove tajweed markups for comparison
    return re.sub(r'\[[^\[]*\[|\]', '', text).replace(' ', '').replace('\u200c', '')

def align_words(tajweed_ayah, plain_words):
    # Split the tajweed ayah into words (using plain words as a guide)
    result = []
    ayah_pointer = 0
    for word in plain_words:
        plain = word['word_arabic'].replace(' ', '').replace('\u200c', '')
        found = False
        for end in range(ayah_pointer+1, len(tajweed_ayah)+1):
            candidate = strip_tajweed(tajweed_ayah[ayah_pointer:end])
            if candidate == plain:
                result.append(tajweed_ayah[ayah_pointer:end])
                ayah_pointer = end
                found = True
                break
        if not found:
            # fallback: just use the plain word
            result.append(word['word_arabic'])
    return result

def extract_tajweed_words(tajweed_ayah, plain_words, problematic_ayahs, surah_number, ayah_number):
    result = []
    ayah_pointer = 0
    for idx, word in enumerate(plain_words):
        plain = word['word_arabic'].replace(' ', '').replace('\u200c', '')
        found = False
        for end in range(ayah_pointer+1, len(tajweed_ayah)+1):
            candidate = tajweed_ayah[ayah_pointer:end]
            candidate_stripped = strip_tajweed(candidate)
            if candidate_stripped == plain:
                result.append(candidate)
                ayah_pointer = end
                found = True
                break
        if not found:
            result.append(word['word_arabic'])
            print(f"Warning: Could not align '{plain}' in '{tajweed_ayah}'")
            problematic_ayahs.append({
                'surah_number': surah_number,
                'ayah_number': ayah_number,
                'word_index': idx,
                'word_arabic': word['word_arabic'],
                'tajweed_text': tajweed_ayah
            })
    return result

with open('quran-tajweed.json', encoding='utf-8') as f:
    tajweed_data = json.load(f)

with open('quran-wordbyword-2.json', encoding='utf-8') as f:
    wbw_data = json.load(f)

problematic_ayahs = []

for surah in wbw_data ['data']['surahs']:
    tajweed_surah = next((s for s in tajweed_data['data']['surahs'] if s['number'] == surah['number']), None)
    if not tajweed_surah:
        continue
    for ayah in surah['ayahs']:
        # The 'words' array is stored as a JSON string in the 'text' field
        try:
            words = json.loads(ayah['text'])
        except Exception as e:
            print(f"Error parsing words for Surah {surah['number']} Ayah {ayah['numberInSurah']}: {e}")
            continue
        tajweed_ayah = next((a for a in tajweed_surah['ayahs'] if a['numberInSurah'] == ayah['numberInSurah']), None)
        if not tajweed_ayah:
            continue
        tajweed_text = tajweed_ayah.get('tajweedText') or tajweed_ayah.get('text')
        if not tajweed_text:
            continue
        # Align words
        tajweed_words = extract_tajweed_words(
            tajweed_text, words, problematic_ayahs, surah['number'], ayah['numberInSurah']
        )
        for i, word in enumerate(words):
            word['word_arabic_tajweed'] = tajweed_words[i] if i < len(tajweed_words) else word['word_arabic']
        # Save the updated words array back as a JSON string
        ayah['text'] = json.dumps(words, ensure_ascii=False)

with open('quran-wordbyword-tajweed.json', 'w', encoding='utf-8') as f:
    json.dump(wbw_data, f, ensure_ascii=False, indent=2)

if problematic_ayahs:
    with open('problematic-ayahs.json', 'w', encoding='utf-8') as f:
        json.dump(problematic_ayahs, f, ensure_ascii=False, indent=2)
    print("Warnings encountered. Details written to problematic-ayahs.json")

print("Done! Output written to quran-wordbyword-tajweed.json")