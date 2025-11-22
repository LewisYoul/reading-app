import { IonContent, IonPage } from '@ionic/react';
import './Tab1.css';
import WeatherSummary from '../components/WeatherSummary';

const Tab1: React.FC = () => {
  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="page-content">
          <WeatherSummary />
          
          {/* <Bin /> */}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
