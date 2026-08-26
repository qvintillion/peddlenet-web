import { LegalDoc } from '@/components/LegalDoc';
import paragraphs from '@/content/terms.json';

export const metadata = {
  title: 'Beta Terms of Service — PeddleNet',
  description:
    'The Beta Terms of Service for the PeddleNet community test. 18+. Experimental software; not a substitute for emergency services.',
};

export default function TermsPage() {
  return (
    <LegalDoc
      paragraphs={paragraphs as string[]}
      otherHref="/privacy"
      otherLabel="Privacy Notice"
    />
  );
}
