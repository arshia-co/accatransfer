// Flow 5 — document checklist placeholder (no real upload in the demo).
import { INTENTS } from '../intents';
import { aiMsg, action } from '../messageKit';

const DOCS_INTRO = {
  fa: 'این چک‌لیست پایه برای شروع آماده‌سازی مدارک است. نیاز دقیق به مقطع، دانشگاه و کشور صادرکننده مدارک بستگی دارد:',
  en: 'Here is a practical starting checklist for your documents. Exact requirements depend on your degree, university, and where the documents were issued:',
  tr: 'Belgelerinizi hazırlamak için pratik bir başlangıç listesi. Kesin gereklilikler dereceye, üniversiteye ve belgelerin düzenlendiği ülkeye bağlıdır:',
  ar: 'هذه قائمة بداية عملية لمستنداتك. تعتمد المتطلبات الدقيقة على الدرجة والجامعة والبلد الذي صدرت فيه المستندات:',
};

const DOCS_NOTE = {
  fa: 'پس از ورود می‌توانید مدارک را اینجا مرتب کنید. پیش از ارسال، هر مورد باید برای دانشگاه مقصد بررسی شود.',
  en: 'After signing in, you can organize documents here. Before submission, each item should be verified for the target university.',
  tr: 'Giriş yaptıktan sonra belgeleri burada düzenleyebilirsiniz. Göndermeden önce her belge hedef üniversite için doğrulanmalıdır.',
  ar: 'بعد تسجيل الدخول يمكنك تنظيم المستندات هنا. قبل الإرسال، يجب التحقق من كل عنصر للجامعة المستهدفة.',
};

const CTA_LOGIN_DOCS = {
  fa: 'ورود و ساخت چک‌لیست شخصی',
  en: 'Sign in to create my document plan',
  tr: 'Belge planımı oluşturmak için giriş yap',
  ar: 'سجّل الدخول لإنشاء خطة مستنداتي',
};
const CTA_BACK = { fa: 'بازگشت به مسیرهای اصلی', en: 'Back to the main paths', tr: 'Ana yollara dön', ar: 'العودة للمسارات الرئيسية' };
const CTA_FAQ = { fa: 'سؤال دیگری دارم', en: 'I have another question', tr: 'Başka sorum var', ar: 'لدي سؤال آخر' };

export const documentFlow = {
  [INTENTS.DOCUMENTS_OVERVIEW]: ({ state }) => {
    const lang = state.language;
    const degree = state.studentProfile?.degree || 'bachelor';
    return {
      messages: [
        aiMsg(lang, DOCS_INTRO, {
          component: 'document_grid',
          payload: { degree },
        }),
        aiMsg(lang, DOCS_NOTE, {
          meta: { tone: 'note' },
          actions: [
            action(lang, CTA_LOGIN_DOCS, 'login', INTENTS.OPEN_LOGIN_GATE, { variant: 'primary', icon: 'LogIn' }),
            action(lang, CTA_FAQ, 'faq', INTENTS.FAQ_START, { icon: 'MessageCircleQuestion' }),
            action(lang, CTA_BACK, 'goals', INTENTS.BACK_TO_GOALS, { icon: 'Undo2' }),
          ],
        }),
      ],
      patch: { currentIntent: INTENTS.DOCUMENTS_OVERVIEW, currentStep: 'documents' },
    };
  },
};
