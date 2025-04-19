import json
import sys
import os

def pad(num):
    return str(num).zfill(3)

def generate_audio_dict(surah, ayah, word, sources=None):
    sources = sources or {"default": ""}
    audio = {}
    for key, suffix in sources.items():
        filename = f"{pad(surah)}_{pad(ayah)}_{pad(word)}{suffix}.mp3"
        audio[key] = filename
    return audio

def add_audio_to_words(input_path, output_path, sources=None):
    with open(input_path, encoding='utf-8') as f:
        data = json.load(f)
    for surah in data['data']['surahs']:
        for ayah in surah['ayahs']:
            try:
                words = json.loads(ayah['text'])
            except Exception as e:
                print(f"Error parsing words for Surah {surah['number']} Ayah {ayah['numberInSurah']}: {e}")
                continue
            for word in words:
                surah_num = surah['number']
                ayah_num = ayah['numberInSurah']
                word_num = word['word_number_in_ayah']
                word['audio'] = generate_audio_dict(surah_num, ayah_num, word_num, sources)
            ayah['text'] = json.dumps(words, ensure_ascii=False)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Audio fields added and written to {output_path}")

if __name__ == "__main__":
    # Example usage:
    # python add_audio_to_words.py input.json output.json
    # For multiple sources: sources = {"default": "", "kids": "_kids"}
    if len(sys.argv) < 3:
        print("Usage: python add_audio_to_words.py input.json output.json")
        sys.exit(1)
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    # Customize sources as needed
    sources = {"default": "", "kids": "_kids"}  # Add more if needed
    add_audio_to_words(input_path, output_path, sources)
