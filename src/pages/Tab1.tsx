import { IonContent, IonPage } from '@ionic/react';
import './Tab1.css';
import WelcomeHeader from '../components/WelcomeHeader';
import WeatherSummary from '../components/WeatherSummary';

const Tab1: React.FC = () => {
  return (
    <IonPage>
      <IonContent fullscreen>
        <WelcomeHeader />
        <WeatherSummary />
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
