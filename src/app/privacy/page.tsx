import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Hobby Lab",
  description: "Hobby Lab のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-bold mb-2">プライバシーポリシー</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        最終更新日: 2026年4月27日
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. 収集する情報</h2>
        <p className="leading-relaxed mb-3">
          本サービス（Hobby Lab）は以下の情報を収集・処理します。
        </p>
        <ul className="list-disc list-inside space-y-2 leading-relaxed">
          <li>
            <strong>OAuthトークン：</strong> TikTok・YouTube・InstagramのOAuth 2.0認証フローを通じて発行されるアクセストークンおよびリフレッシュトークン。ブラウザのCookie（HttpOnly）にのみ保存されます。
          </li>
          <li>
            <strong>動画ファイル：</strong> 投稿用にアップロードされた動画は、Supabase Storageの一時バケットに保存されます。投稿処理完了後、自動的に削除されます。
          </li>
          <li>
            <strong>テキスト情報：</strong> 入力されたタイトル・キャプションは投稿処理のみに使用され、保存されません。
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. 情報の利用目的</h2>
        <ul className="list-disc list-inside space-y-2 leading-relaxed">
          <li>各SNSプラットフォームへの動画投稿処理</li>
          <li>OAuthセッションの維持（トークンのリフレッシュ）</li>
        </ul>
        <p className="leading-relaxed mt-3">
          収集した情報を第三者に販売・提供することはありません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. TikTok APIの利用</h2>
        <p className="leading-relaxed">
          本サービスはTikTok Content Posting APIを使用します。
          TikTokから取得するデータは動画投稿の実行にのみ使用します。
          TikTokのプライバシーポリシーは
          <a
            href="https://www.tiktok.com/legal/page/us/privacy-policy/en"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline ml-1"
          >
            こちら
          </a>
          をご参照ください。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. データの保存期間</h2>
        <ul className="list-disc list-inside space-y-2 leading-relaxed">
          <li>OAuthトークン：ブラウザのCookieに保存。Cookie削除またはセッション終了時に消去されます。</li>
          <li>動画ファイル：投稿処理完了後に即時削除されます。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Cookie の使用</h2>
        <p className="leading-relaxed">
          本サービスはOAuthトークンの保持にCookieを使用します。ブラウザの設定でCookieを無効にすると、SNS連携機能が動作しません。
          第三者のトラッキングCookieは使用しません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. セキュリティ</h2>
        <p className="leading-relaxed">
          アクセストークンはHttpOnly Cookieに保存し、JavaScriptからのアクセスを防ぎます。
          動画の一時保存にはSupabase Storageの署名付きURLを使用し、直接アクセスを制限しています。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. お問い合わせ</h2>
        <p className="leading-relaxed">
          プライバシーに関するお問い合わせは、サービス内のフィードバック機能よりご連絡ください。
        </p>
      </section>
    </main>
  );
}
