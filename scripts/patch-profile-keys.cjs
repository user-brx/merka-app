const fs = require('fs');

const filePath = './src/i18n/translations.ts';
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Update Translations interface
if (!code.includes('helpUsername: string;')) {
  code = code.replace(
    /helpNip05: string; helpLud16: string; helpWebsite: string;/,
    "helpNip05: string; helpLud16: string; helpWebsite: string;\n    helpUsername: string; helpDisplayName: string; helpBio: string;\n    tagFilterPlaceholder: string; clearSearch: string; noTagsFound: string;"
  );
}

const translationsToAdd = {
  en: {
    helpUsername: 'Your unique username (e.g. satoshi)',
    helpDisplayName: 'Name that will be publicly displayed',
    helpBio: 'A brief description about yourself',
    tagFilterPlaceholder: 'filter...',
    clearSearch: 'Clear',
    noTagsFound: 'no tags'
  },
  pt: {
    helpUsername: 'Seu nome de usuário único (ex: satoshi)',
    helpDisplayName: 'Nome que será exibido publicamente',
    helpBio: 'Uma breve descrição sobre você',
    tagFilterPlaceholder: 'filtrar...',
    clearSearch: 'Limpar',
    noTagsFound: 'sem tags'
  },
  es: {
    helpUsername: 'Tu nombre de usuario único (ej: satoshi)',
    helpDisplayName: 'Nombre que se mostrará públicamente',
    helpBio: 'Una breve descripción sobre ti',
    tagFilterPlaceholder: 'filtrar...',
    clearSearch: 'Limpiar',
    noTagsFound: 'sin etiquetas'
  },
  it: {
    helpUsername: 'Il tuo nome utente univoco (es. satoshi)',
    helpDisplayName: 'Nome che verrà mostrato pubblicamente',
    helpBio: 'Una breve descrizione su di te',
    tagFilterPlaceholder: 'filtra...',
    clearSearch: 'Pulisci',
    noTagsFound: 'nessun tag'
  },
  de: {
    helpUsername: 'Ihr eindeutiger Benutzername (z.B. satoshi)',
    helpDisplayName: 'Name, der öffentlich angezeigt wird',
    helpBio: 'Eine kurze Beschreibung über dich',
    tagFilterPlaceholder: 'filtern...',
    clearSearch: 'Löschen',
    noTagsFound: 'keine Tags'
  },
  hi: {
    helpUsername: 'आपका विशिष्ट उपयोगकर्ता नाम (उदा. satoshi)',
    helpDisplayName: 'वह नाम जो सार्वजनिक रूप से प्रदर्शित होगा',
    helpBio: 'अपने बारे में संक्षिप्त विवरण',
    tagFilterPlaceholder: 'फ़िल्टर...',
    clearSearch: 'साफ़ करें',
    noTagsFound: 'कोई टैग नहीं'
  },
  ja: {
    helpUsername: 'あなた固有のユーザー名 (例: satoshi)',
    helpDisplayName: '公開される名前',
    helpBio: '自己紹介を追加',
    tagFilterPlaceholder: 'フィルター...',
    clearSearch: 'クリア',
    noTagsFound: 'タグなし'
  },
  zh: {
    helpUsername: '您的唯一用户名（例如：satoshi）',
    helpDisplayName: '将公开显示的名称',
    helpBio: '简短介绍一下自己',
    tagFilterPlaceholder: '过滤...',
    clearSearch: '清除',
    noTagsFound: '暂无标签'
  },
  ar: {
    helpUsername: 'اسم المستخدم الفريد الخاص بك (مثل satoshi)',
    helpDisplayName: 'الاسم الذي سيتم عرضه علنًا',
    helpBio: 'وصف موجز عن نفسك',
    tagFilterPlaceholder: 'تصفية...',
    clearSearch: 'مسح',
    noTagsFound: 'لا توجد علامات'
  },
  ru: {
    helpUsername: 'Ваше уникальное имя пользователя (например, satoshi)',
    helpDisplayName: 'Имя, которое будет отображаться публично',
    helpBio: 'Краткое описание о себе',
    tagFilterPlaceholder: 'фильтр...',
    clearSearch: 'Очистить',
    noTagsFound: 'нет тегов'
  },
  fr: {
    helpUsername: 'Votre nom d\'utilisateur unique (ex: satoshi)',
    helpDisplayName: 'Nom qui sera affiché publiquement',
    helpBio: 'Une brève description de vous-même',
    tagFilterPlaceholder: 'filtrer...',
    clearSearch: 'Effacer',
    noTagsFound: 'aucun tag'
  },
  tr: {
    helpUsername: 'Benzersiz kullanıcı adınız (örn. satoshi)',
    helpDisplayName: 'Herkese açık olarak gösterilecek ad',
    helpBio: 'Kendiniz hakkında kısa bir açıklama',
    tagFilterPlaceholder: 'filtrele...',
    clearSearch: 'Temizle',
    noTagsFound: 'etiket yok'
  },
  fa: {
    helpUsername: 'نام کاربری منحصر به فرد شما (مانند satoshi)',
    helpDisplayName: 'نامی که به صورت عمومی نمایش داده می‌شود',
    helpBio: 'توضیح مختصری درباره خودتان',
    tagFilterPlaceholder: 'فیلتر...',
    clearSearch: 'پاک کردن',
    noTagsFound: 'بدون برچسب'
  },
  vi: {
    helpUsername: 'Tên người dùng duy nhất của bạn (VD: satoshi)',
    helpDisplayName: 'Tên sẽ được hiển thị công khai',
    helpBio: 'Mô tả ngắn gọn về bản thân',
    tagFilterPlaceholder: 'lọc...',
    clearSearch: 'Xóa',
    noTagsFound: 'không có thẻ'
  },
  uk: {
    helpUsername: 'Ваше унікальне ім\'я користувача (наприклад, satoshi)',
    helpDisplayName: 'Ім\'я, яке буде відображатися публічно',
    helpBio: 'Короткий опис про себе',
    tagFilterPlaceholder: 'фільтр...',
    clearSearch: 'Очистити',
    noTagsFound: 'немає тегів'
  }
};

for (const [lang, vars] of Object.entries(translationsToAdd)) {
  const findStr = lang + ": t({";
  const helpTarget = "helpNip05:";
  
  const blockStart = code.indexOf(findStr);
  if (blockStart === -1) {
    console.error('Could not find lang:', lang);
    continue;
  }
  
  const targetPos = code.indexOf(helpTarget, blockStart);
  if (targetPos === -1) {
    console.error('Could not find target in lang:', lang);
    continue;
  }
  
  const blockChunk = code.slice(blockStart, targetPos);
  if (blockChunk.includes('helpUsername:')) {
    console.log('Already added for', lang);
    continue;
  }
  
  const u = JSON.stringify(vars.helpUsername);
  const d = JSON.stringify(vars.helpDisplayName);
  const b = JSON.stringify(vars.helpBio);
  const tf = JSON.stringify(vars.tagFilterPlaceholder);
  const cs = JSON.stringify(vars.clearSearch);
  const nt = JSON.stringify(vars.noTagsFound);

  const strToInject = `helpUsername: ${u}, helpDisplayName: ${d}, helpBio: ${b}, tagFilterPlaceholder: ${tf}, clearSearch: ${cs}, noTagsFound: ${nt},\n        `;
  code = code.slice(0, targetPos) + strToInject + code.slice(targetPos);
}

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Patched translations.ts successfully with profile and UI keys!');
