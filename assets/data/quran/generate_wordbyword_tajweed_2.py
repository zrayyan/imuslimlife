import json
import re
import unicodedata

def strip_tajweed(text):
    # Remove all [tag[...]] and [tag] patterns
    text = re.sub(r'\[[^\[\]]*\[|\[.*?\]', '', text)
    text = text.replace('\u200c', '').replace(' ', '')
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r'[إأآا]', 'ا', text)
    return text

def normalize_arabic(text):
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r'[إأآا]', 'ا', text)
    return text.replace(' ', '').replace('\u200c', '')

def extract_tajweed_words(tajweed_ayah, plain_words, problematic_ayahs, surah_number, ayah_number, max_warnings_per_ayah=3):
    result = []
    ayah_pointer = 0
    warning_count = 0
    for idx, word in enumerate(plain_words):
        plain = normalize_arabic(word['word_arabic'])
        found = False
        for end in range(ayah_pointer+1, len(tajweed_ayah)+1):
            candidate = tajweed_ayah[ayah_pointer:end]
            candidate_stripped = strip_tajweed(candidate)
            candidate_stripped = normalize_arabic(candidate_stripped)
            if candidate_stripped == plain:
                result.append(candidate)
                ayah_pointer = end
                found = True
                break
        if not found:
            result.append(word['word_arabic'])
            if warning_count < max_warnings_per_ayah:
                print(f"Warning: Could not align '{plain}' in Surah {surah_number} Ayah {ayah_number}")
                warning_count += 1
            problematic_ayahs.append({
                'surah_number': surah_number,
                'ayah_number': ayah_number,
                'word_index': idx,
                'word_arabic': word['word_arabic'],
                'tajweed_text': tajweed_ayah
            })
    return result

# Debugging: Print detailed comparison for Surah 1 (or Surah 114)
DEBUG_SURAH = 1  # Change to 114 for Surah 114

def print_detailed_comparison(surah, tajweed_surah):
    print(f"\nDetailed comparison for Surah {surah['number']} - {surah['englishName']}")
    for ayah in surah['ayahs']:
        try:
            words = json.loads(ayah['text'])
        except Exception as e:
            print(f"  Error parsing words for Ayah {ayah['numberInSurah']}: {e}")
            continue
        tajweed_ayah = next((a for a in tajweed_surah['ayahs'] if a['numberInSurah'] == ayah['numberInSurah']), None)
        if not tajweed_ayah:
            print(f"  No tajweed ayah found for Ayah {ayah['numberInSurah']}")
            continue
        tajweed_text = tajweed_ayah.get('tajweedText') or tajweed_ayah.get('text')
        print(f"\nAyah {ayah['numberInSurah']}:")
        print(f"  WBW words ({len(words)}): {[w['word_arabic'] for w in words]}")
        print(f"  Tajweed text: {tajweed_text}")
        # Optionally, print the result of the alignment attempt
        aligned = extract_tajweed_words(tajweed_text, words, [], surah['number'], ayah['numberInSurah'])
        print(f"  Alignment result ({len(aligned)}): {aligned}")

with open('quran-tajweed.json', encoding='utf-8') as f:
    tajweed_data = json.load(f)

with open('quran-wordbyword-2.json', encoding='utf-8') as f:
    wbw_data = json.load(f)

# After loading data, before main processing, print detailed comparison for the debug surah
surah_debug = next((s for s in wbw_data['data']['surahs'] if s['number'] == DEBUG_SURAH), None)
tajweed_surah_debug = next((s for s in tajweed_data['data']['surahs'] if s['number'] == DEBUG_SURAH), None)
if surah_debug and tajweed_surah_debug:
    print_detailed_comparison(surah_debug, tajweed_surah_debug)

problematic_ayahs = []

# Collect stats for summary
ayahs_with_problems = set()
total_ayahs = 0
for surah in wbw_data['data']['surahs']:
    tajweed_surah = next((s for s in tajweed_data['data']['surahs'] if s['number'] == surah['number']), None)
    if not tajweed_surah:
        continue
    for ayah in surah['ayahs']:
        total_ayahs += 1
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
        before_problem_count = len(problematic_ayahs)
        tajweed_words = extract_tajweed_words(
            tajweed_text, words, problematic_ayahs, surah['number'], ayah['numberInSurah']
        )
        if len(problematic_ayahs) > before_problem_count:
            ayahs_with_problems.add((surah['number'], ayah['numberInSurah']))
        for i, word in enumerate(words):
            if i < len(tajweed_words):
                word['word_arabic_tajweed'] = tajweed_words[i]
            else:
                word['word_arabic_tajweed'] = word['word_arabic']
        ayah['text'] = json.dumps(words, ensure_ascii=False)

with open('quran-wordbyword-tajweed.json', 'w', encoding='utf-8') as f:
    json.dump(wbw_data, f, ensure_ascii=False, indent=2)

with open('problematic_ayahs.json', 'w', encoding='utf-8') as f:
    json.dump(problematic_ayahs, f, ensure_ascii=False, indent=2)

# Print summary
print("\nSummary:")
print(f"Total ayahs processed: {total_ayahs}")
print(f"Total ayahs with alignment problems: {len(ayahs_with_problems)}")
if ayahs_with_problems:
    print("Sample problematic ayahs (up to 10):")
    for i, (s, a) in enumerate(sorted(ayahs_with_problems)):
        if i >= 10:
            break
        print(f"  Surah {s}, Ayah {a}")
print("Done! Output written to quran-wordbyword-tajweed.json and problematic_ayahs.json")