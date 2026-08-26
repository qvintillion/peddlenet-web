import { LegalDoc } from '@/components/LegalDoc';
import paragraphs from '@/content/privacy.json';

export const metadata = {
  title: 'Privacy Notice — PeddleNet',
  description:
    'What personal data PeddleNet processes during the community test, why, and your rights under GDPR.',
};

export default function PrivacyPage() {
  return (
    <LegalDoc
      paragraphs={paragraphs as string[]}
      otherHref="/terms"
      otherLabel="Beta Terms of Service"
    />
  );
}
