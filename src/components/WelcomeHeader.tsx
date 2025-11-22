import { IonText } from '@ionic/react';
import './WelcomeHeader.css';

interface WelcomeHeaderProps {
  headerText?: string;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ headerText }) => {
  return (
    <IonText>
      <h1>{headerText}</h1>
    </IonText>
  );
};

export default WelcomeHeader;
