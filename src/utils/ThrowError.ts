
import { GraphQLError } from 'graphql';


const ThrowError = (message: string, code: string = 'USER') => {
    throw new GraphQLError(message, {
        extensions: { code },
    });
};

export default ThrowError;