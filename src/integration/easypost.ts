import EastPost from '@easypost/api';
import 'dotenv/config';
import catchError from '../utils/catchError';
import EasyPost from '@easypost/api/types/EasyPost';

interface FromAddress {
    street1: string,
    street2: string | null,
    city: string,
    state: string,
    zip: string,
    country: string,
    company: string,
    phone: string,
}
interface ToAddress {
    name: string,
    street1: string,
    city: string,
    state: string,
    zip: string,
    country: string,
    email: string,
    phone: string,
}
interface Parcel {
    length: number,
    width: number,
    height: number,
    weight: number,
}

interface CustomInfo {
    description: string;
    quantity: number;
    weight: number;
    value: number;
    hs_tariff_number: string;
    origin_country: string;
}

interface CustomsInfo {
    customs_items: CustomInfo[];
}

export class EasyPostIntegration {
    private apiKey: string;
    private client: EasyPost;

    constructor() {
        this.apiKey = process.env.EASYPOST_API_KEY || '';
        this.client = new EastPost(this.apiKey);
    }

    async createShipmentLogistics({fromAddress, toAddress, parcel, customsInfo}: {fromAddress: FromAddress, toAddress: ToAddress, parcel: Parcel, customsInfo?: CustomsInfo}) {
        const shipmentData: any = {
            from_address: fromAddress,
            to_address: toAddress,
            parcel: parcel
        };
        
        if (customsInfo) {
            shipmentData.customs_info = customsInfo;
        }
        
        return this.client.Shipment.create(shipmentData);
    }

    async purchaseLabel(shipmentId: string, rateId: string) {
        return this.client.Shipment.buy(shipmentId, rateId)
    }

    async getTrackingInfo(trackingCode: string, carrier: string) {
        const [error, response] = await catchError(
            this.client.Tracker.create({
                tracking_code: trackingCode,
                carrier: carrier
            })
        );
        return { error, response };
    }


}
