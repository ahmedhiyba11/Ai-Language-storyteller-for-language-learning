import { type Language, type Difficulty, type Tone, type VocabFocus, type StoryLength } from './types';

export const LANGUAGES: Language[] = [
    { name: 'Arabic', code: 'ar', radioName: 'BBC News Arabic', radioUrls: ['https://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio', 'http://bbcwssc.ic.llnwd.net/stream/bbcwssc_ar_l_p'] },
    { name: 'Italian', code: 'it', radioName: 'RTL 102.5', radioUrls: ['https://streamingv2.shoutcast.com/rtl-1025', 'http://ice07.fluidstream.net/kisskiss.aac'] },
    { name: 'French', code: 'fr', radioName: 'France Info', radioUrls: ['https://icecast.radiofrance.fr/franceinfo-hifi.mp3', 'https://icecast.radiofrance.fr/franceinter-hifi.mp3'] },
    { name: 'Spanish', code: 'es', radioName: 'RNE Radio 5', radioUrls: ['https://rtve-radio-main-abertis-live.flumotion.com/rtve/rne_r5_mad.mp3', 'https://rtve-radio-main-abertis-live.flumotion.com/rtve/rne_r1_mad.mp3'] },
    { name: 'German', code: 'de', radioName: 'Deutschlandfunk', radioUrls: ['https://deutschlandfunk.live.addradio.de/dlf/mp3/128/stream.mp3', 'https://deutschlandfunkkultur.live.addradio.de/dlfkultur/mp3/128/stream.mp3'] },
    { name: 'Portuguese', code: 'pt', radioName: 'RTP Antena 1', radioUrls: ['https://streaming-live.rtp.pt/antena180a', 'https://streaming-live.rtp.pt/antena380a'] },
    { name: 'Japanese', code: 'ja' },
    { name: 'Korean', code: 'ko' },
    { name: 'Mandarin Chinese', code: 'zh', ttsCode: 'zh-cmn' },
];

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
    { id: 'A1', label: 'Beginner (A1)' },
    { id: 'A2', label: 'Elementary (A2)' },
    { id: 'B1', label: 'Intermediate (B1)' },
    { id: 'B2', label: 'Upper-Intermediate (B2)' },
];

export const TONES: { id: Tone; label: string }[] = [
    { id: 'childrens-story', label: "Children's Story" },
    { id: 'daily-conversation', label: 'Daily Conversation' },
    { id: 'news-style', label: 'News Style' },
    { id: 'fairy-tale', label: 'Fairy Tale' },
];

export const VOCAB_FOCUSES: { id: VocabFocus; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'travel', label: 'Travel' },
    { id: 'food', label: 'Food' },
    { id: 'work', label: 'Work' },
    { id: 'verbs', label: 'Verbs' },
];

export const STORY_LENGTHS: { id: StoryLength; label: string }[] = [
    { id: 'short', label: 'Short (4 Sentences)' },
    { id: 'medium', label: 'Medium (6 Sentences)' },
    { id: 'long', label: 'Long (8 Sentences)' },
];