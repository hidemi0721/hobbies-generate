import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | Hobby Lab",
  description: "Hobby Lab の利用規約",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-bold mb-2">利用規約</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        最終更新日: 2026年4月27日
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. サービスについて</h2>
        <p className="leading-relaxed">
          Hobby Lab（以下「本サービス」）は、個人が趣味として開発したAIツールおよびSNS投稿支援ツールを提供するウェブアプリケーションです。
          本サービスには、YouTube・Instagram・TikTokへの動画一括投稿機能（SNS Bulk Poster）が含まれます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. 利用条件</h2>
        <ul className="list-disc list-inside space-y-2 leading-relaxed">
          <li>本サービスは個人利用を目的としています。</li>
          <li>
            利用者は各SNSプラットフォームの利用規約（TikTok・YouTube・Instagram）を遵守してください。
          </li>
          <li>著作権・肖像権を侵害するコンテンツのアップロードを禁止します。</li>
          <li>スパム・虚偽情報・有害コンテンツの投稿を禁止します。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. SNS連携について</h2>
        <p className="leading-relaxed">
          本サービスはOAuth 2.0を使用してTikTok・YouTube・InstagramのAPIに接続します。
          取得するアクセストークンはブラウザのCookieにのみ保存され、サーバーや外部データベースには保存しません。
          動画ファイルは投稿処理後に一時ストレージから自動削除されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. 免責事項</h2>
        <p className="leading-relaxed">
          本サービスは「現状有姿」で提供されます。サービスの中断・投稿の失敗・データ損失について、開発者は一切の責任を負いません。
          各SNSプラットフォームのAPI仕様変更により、機能が正常に動作しなくなる場合があります。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. 規約の変更</h2>
        <p className="leading-relaxed">
          本規約は予告なく変更される場合があります。重要な変更がある場合はサービス上で通知します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. お問い合わせ</h2>
        <p className="leading-relaxed">
          本規約に関するお問い合わせは、サービス内のフィードバック機能よりご連絡ください。
        </p>
      </section>
    </main>
  );
}
