import EastPost from '@easypost/api';
import 'dotenv/config';
import catchError from '../utils/catchError';

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
export class EasyPostIntegration {
    private apiKey: string;
    private client: any;

    constructor() {
        this.apiKey = process.env.EASYPOST_API_KEY || '';
        this.client = new EastPost(this.apiKey);
    }

    async createShipmentLogistics({fromAddress, toAddress, parcel}: {fromAddress: FromAddress, toAddress: ToAddress, parcel: Parcel}) {
        return this.client.Shipment.create({
            from_address: fromAddress,
            to_address: toAddress,
            parcel: parcel
        });
    }

    async purchaseLabel(shipmentId: string, rateId: string) {
        return this.client.Shipment.retrieve(shipmentId).then((shipment: any) => 
            shipment.buy({ rate: { id: rateId } })
        );
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
